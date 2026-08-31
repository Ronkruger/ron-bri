import { Server } from "socket.io";
import http from "http";
import { socketAuthMiddleware } from "../middleware/socketAuth";
import { messageService } from "../services";
import { pushService } from "../services/push.service";
import { prisma } from "../lib/prisma";

const connectedUsers = new Set<string>();

export const initSocket = (httpServer: http.Server): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL ?? "http://localhost:5173",
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    connectedUsers.add(userId);
    void prisma.user.findMany({ select: { id: true, lastSeenAt: true } }).then((users) => {
      socket.emit("presence:snapshot", {
        users: users.map((person) => ({
          userId: person.id,
          online: connectedUsers.has(person.id),
          lastSeenAt: person.lastSeenAt?.toISOString() ?? null,
        })),
      });
    }).catch(() => undefined);
    socket.broadcast.emit("presence:update", { userId, online: true, lastSeenAt: null });
    console.log(`🔌 Socket connected: ${userId}`);

    // ── message:send ──────────────────────────────────────────────────────────
    socket.on(
      "message:send",
      async (data: { content?: string; imageUrl?: string; gifUrl?: string }) => {
        try {
          const message = await messageService.create(userId, data);
          const receiverId = userId === "user_boy" ? "user_girl" : "user_boy";
          // Emit to receiver and echo to sender
          io.to(`user:${receiverId}`).emit("message:new", { message });
          socket.emit("message:new", { message });
          void pushService.sendMessage(receiverId, message);
        } catch (err) {
          console.error("message:send error", err);
        }
      }
    );

    // ── message:typing ────────────────────────────────────────────────────────
    socket.on("message:typing", ({ isTyping }: { isTyping: boolean }) => {
      const receiverId = userId === "user_boy" ? "user_girl" : "user_boy";
      io.to(`user:${receiverId}`).emit("message:typing", { userId, isTyping });
    });

    // ── message:read ──────────────────────────────────────────────────────────
    socket.on("message:read", async ({ messageId }: { messageId: string }) => {
      try {
        const message = await messageService.markRead(messageId);
        io.to(`user:${message.senderId}`).emit("message:read", {
          messageId,
          readAt: message.readAt,
        });
      } catch (err) {
        console.error("message:read error", err);
      }
    });

    // ── heart:send ────────────────────────────────────────────────────────────
    socket.on("heart:send", () => {
      const receiverId = userId === "user_boy" ? "user_girl" : "user_boy";
      io.to(`user:${receiverId}`).emit("heart:received", { fromUserId: userId });
    });

    socket.on("disconnect", () => {
      connectedUsers.delete(userId);
      const lastSeenAt = new Date().toISOString();
      void prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date(lastSeenAt) } }).catch(() => undefined);
      socket.broadcast.emit("presence:update", { userId, online: false, lastSeenAt });
      console.log(`🔌 Socket disconnected: ${userId}`);
    });
  });

  return io;
};
