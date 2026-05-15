const sound = typeof window !== "undefined" ? new Audio("/notification/notification.mp3") : null;

export function playNotificationSound() {
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

export async function fireNotification(title: string, body: string) {
  playNotificationSound();

  if (typeof window === "undefined") {
    console.error("[notify] SSR context — cannot show notification");
    return;
  }
  if (!("Notification" in window)) {
    console.error("[notify] Notification API not supported (iOS Safari requires PWA added to home screen)");
    return;
  }

  console.log("[notify] permission:", Notification.permission);
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
    console.log("[notify] permission after prompt:", permission);
  }

  if (permission !== "granted") {
    console.error(`[notify] Blocked — permission='${permission}'. On iOS: add to Home Screen first. On Android/Desktop: allow in browser site settings.`);
    return;
  }

  // Prefer service worker showNotification (works on Android & iOS PWA)
  const reg = await getSwRegistration();
  if (reg) {
    console.log("[notify] Using SW showNotification");
    await reg.showNotification(title, { body, icon: "/favicon.svg", badge: "/favicon.svg" });
  } else {
    // Desktop fallback
    console.log("[notify] Using new Notification() (no SW)");
    new Notification(title, { body, icon: "/favicon.svg" });
  }
}

export function requestNotificationPermission() {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then((p) => console.log("[notify] Initial permission:", p));
  }
}

