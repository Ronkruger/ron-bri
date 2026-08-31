import { prisma } from "../lib/prisma";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_TOKEN_PATTERN = /^(ExpoPushToken|ExponentPushToken)\[[^\]]+\]$/;

type PushMessage = {
  id: string;
  content: string | null;
  imageUrl: string | null;
  gifUrl: string | null;
  senderId: string;
  sender: { displayName: string };
};

export const isExpoPushToken = (token: string) => EXPO_TOKEN_PATTERN.test(token);

const messagePreview = (message: PushMessage) => {
  if (message.content?.trim()) return message.content.trim().slice(0, 180);
  if (message.imageUrl) return "Sent a photo";
  if (message.gifUrl) return "Sent a GIF";
  return "Sent a message";
};

export const pushService = {
  register: (userId: string, token: string, platform: string) =>
    prisma.pushToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    }),

  unregister: (userId: string, token: string) =>
    prisma.pushToken.deleteMany({ where: { userId, token } }),

  async sendMessage(receiverId: string, message: PushMessage) {
    const registrations = await prisma.pushToken.findMany({
      where: { userId: receiverId },
      select: { token: true },
    });
    const tokens = registrations.map(({ token }) => token).filter(isExpoPushToken);
    if (tokens.length === 0) return;

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tokens.map((to) => ({
          to,
          title: message.sender.displayName,
          body: messagePreview(message),
          sound: "default",
          priority: "high",
          channelId: "messages",
          categoryId: "message_reply",
          data: {
            type: "message",
            messageId: message.id,
            senderId: message.senderId,
          },
        }))),
      });

      if (!response.ok) {
        console.error("Expo push delivery rejected", { status: response.status });
      }
    } catch (error) {
      console.error("Expo push delivery unavailable", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    }
  },
};
