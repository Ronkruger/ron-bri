const sound = typeof window !== "undefined" ? new Audio("/notification/notification.mp3") : null;

export function playNotificationSound() {
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

export async function fireNotification(title: string, body: string) {
  playNotificationSound();
  if (typeof window === "undefined" || !("Notification" in window)) return;
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission === "granted") {
    new Notification(title, { body, icon: "/favicon.svg" });
  }
}

export function requestNotificationPermission() {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}
