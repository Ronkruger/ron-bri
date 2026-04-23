import { prisma } from "../lib/prisma";
import { Server } from "socket.io";

let io: Server | null = null;

export const setIo = (socketServer: Server) => {
  io = socketServer;
};

export const getIo = () => io;

// ─── Calendar Service ─────────────────────────────────────────────────────────

export const calendarService = {
  findAll: () =>
    prisma.dateEvent.findMany({
      include: { createdBy: true },
      orderBy: { date: "asc" },
    }),

  findById: (id: string) =>
    prisma.dateEvent.findUnique({ where: { id }, include: { createdBy: true } }),

  create: (userId: string, data: {
    title: string;
    description?: string;
    date: string;
    emoji?: string;
    imageUrl?: string;
  }) =>
    prisma.dateEvent.create({
      data: {
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        emoji: data.emoji,
        imageUrl: data.imageUrl,
        createdById: userId,
      },
      include: { createdBy: true },
    }),

  update: (id: string, data: {
    title?: string;
    description?: string;
    date?: string;
    emoji?: string;
    imageUrl?: string;
  }) =>
    prisma.dateEvent.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
      include: { createdBy: true },
    }),

  delete: (id: string) =>
    prisma.dateEvent.delete({ where: { id } }),
};

// ─── Invite Service ───────────────────────────────────────────────────────────

export const inviteService = {
  create: (senderId: string, data: {
    type: any;
    title: string;
    message: string;
    emojis: string[];
    gifUrl?: string;
    imageUrl?: string;
  }) => {
    const receiverId = senderId === "user_boy" ? "user_girl" : "user_boy";
    return prisma.dateInvite.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        emojis: data.emojis,
        gifUrl: data.gifUrl,
        imageUrl: data.imageUrl,
        senderId,
        receiverId,
      },
      include: { sender: true, receiver: true },
    });
  },

  inbox: (userId: string) =>
    prisma.dateInvite.findMany({
      where: { receiverId: userId },
      include: { sender: true, receiver: true },
      orderBy: { createdAt: "desc" },
    }),

  sent: (userId: string) =>
    prisma.dateInvite.findMany({
      where: { senderId: userId },
      include: { sender: true, receiver: true },
      orderBy: { createdAt: "desc" },
    }),

  findById: (id: string) =>
    prisma.dateInvite.findUnique({
      where: { id },
      include: { sender: true, receiver: true },
    }),

  respond: (id: string, status: "ACCEPTED" | "DECLINED") =>
    prisma.dateInvite.update({
      where: { id },
      data: { status },
      include: { sender: true, receiver: true },
    }),

  markSeen: (id: string) =>
    prisma.dateInvite.update({
      where: { id },
      data: { seenAt: new Date() },
      include: { sender: true, receiver: true },
    }),

  pendingUnseen: (userId: string) =>
    prisma.dateInvite.findMany({
      where: { receiverId: userId, status: "PENDING", seenAt: null },
      include: { sender: true, receiver: true },
      orderBy: { createdAt: "asc" },
    }),
};

// ─── Message Service ──────────────────────────────────────────────────────────

export const messageService = {
  list: async (cursor?: string, limit = 50) => {
    const messages = await prisma.message.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { sender: true },
      orderBy: { createdAt: "desc" },
    });
    const hasMore = messages.length > limit;
    const result = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? result[result.length - 1].id : null;
    return { messages: result.reverse(), nextCursor, hasMore };
  },

  create: (senderId: string, data: {
    content?: string;
    imageUrl?: string;
    gifUrl?: string;
  }) =>
    prisma.message.create({
      data: { senderId, ...data },
      include: { sender: true },
    }),

  markRead: (messageId: string) =>
    prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() },
      include: { sender: true },
    }),
};

// ─── Relationship Service ─────────────────────────────────────────────────────

export const relationshipService = {
  get: () => prisma.relationship.findUnique({ where: { id: "singleton" } }),

  update: (startDate: string) =>
    prisma.relationship.update({
      where: { id: "singleton" },
      data: { startDate: new Date(startDate) },
    }),
};
