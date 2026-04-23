import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./axios";

const BASE_URL =
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL
    ? process.env.EXPO_PUBLIC_API_URL
    : (import.meta as any)?.env?.VITE_API_URL ?? "http://localhost:3001";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(BASE_URL, {
      autoConnect: false,
      withCredentials: true,
      auth: (cb) => {
        cb({ token: getAccessToken() });
      },
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
  socket = null;
};
