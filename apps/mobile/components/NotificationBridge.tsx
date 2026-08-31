import React from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { messagesApi } from "@ronbri/api-client";
import { useAuth } from "../contexts/AuthContext";
import { REPLY_ACTION } from "./notifications";

type ReplyResponse = Notifications.NotificationResponse & { userText?: string };

export function NotificationBridge() {
  const { user } = useAuth();
  const router = useRouter();
  const processed = React.useRef(new Set<string>());

  const handleResponse = React.useCallback(async (response: Notifications.NotificationResponse | null) => {
    if (!response || !user) return;
    const notification = response.notification;
    const data = notification.request.content.data;
    if (data?.type !== "message") return;

    const responseKey = `${notification.request.identifier}:${response.actionIdentifier}`;
    if (processed.current.has(responseKey)) return;
    processed.current.add(responseKey);

    if (response.actionIdentifier === REPLY_ACTION) {
      const reply = (response as ReplyResponse).userText?.trim();
      if (reply) {
        try {
          await messagesApi.create({ content: reply });
        } catch {
          Toast.show({ type: "error", text1: "Reply not sent", text2: "Open chat and try again." });
        }
      }
    }

    router.push("/(tabs)/chat");
  }, [router, user]);

  React.useEffect(() => {
    if (!user) return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleResponse(response);
    });
    void Notifications.getLastNotificationResponseAsync().then(handleResponse);
    return () => subscription.remove();
  }, [handleResponse, user?.id]);

  return null;
}
