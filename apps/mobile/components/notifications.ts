import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const MESSAGE_CATEGORY = "message_reply";
export const REPLY_ACTION = "reply";

export async function configureNotifications(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Messages",
      description: "Messages from your partner",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 150, 100, 150],
      lightColor: "#B98267",
    });
  }

  await Notifications.setNotificationCategoryAsync(MESSAGE_CATEGORY, [
    {
      identifier: REPLY_ACTION,
      buttonTitle: "Reply",
      options: { opensAppToForeground: true },
      textInput: {
        submitButtonTitle: "Send",
        placeholder: "Write a reply…",
      },
    },
  ]);
}

export async function requestNotificationPermission(): Promise<boolean> {
  await configureNotifications();

  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

export async function getExpoPushToken(): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn("Push registration skipped: EAS project ID is unavailable.");
    return null;
  }

  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    console.warn("Push registration unavailable", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return null;
  }
}
