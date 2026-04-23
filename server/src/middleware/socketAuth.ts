import { Socket } from "socket.io";
import jwt from "jsonwebtoken";

export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error("Authentication error: no token"));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return next(new Error("Server configuration error"));

    const payload = jwt.verify(token, secret) as { userId: string; role: string };
    socket.data.userId = payload.userId;
    socket.data.role = payload.role;
    next();
  } catch {
    next(new Error("Authentication error: invalid token"));
  }
};
