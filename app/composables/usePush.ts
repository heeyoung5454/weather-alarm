import { getApp } from "firebase/app";
import { getToken, isSupported, getMessaging, onMessage } from "firebase/messaging";

export const usePush = async () => {
  const supported = await isSupported();

  if (!supported) {
    console.warn("Firebase Messaging not supported (use HTTPS or localhost)");
    return undefined;
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    console.log("알림 거부");
    return undefined;
  }

  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  }

  const app = getApp();
  const messaging = getMessaging(app);

  const token = await getToken(messaging, {
    vapidKey: "BCUIMngW07B5in35GHdHxKrJmN7rYz0HGgmvE555wVdt3kRYFfqTXivntZ_0Uokt0EY5P77ld7qK-apjAjzUUTc",
    serviceWorkerRegistration: registration,
  });

  console.log("FCM TOKEN:", token);

  // 🔥 포그라운드 푸시 수신 (클릭 시 data.url로 이동)
  onMessage(messaging, (payload) => {
    console.log("Foreground message:", payload);

    const title = payload.notification?.title || payload.data?.title || "알림";
    const body = payload.notification?.body || payload.data?.body || "";
    const url = payload.data?.url;

    const notification = new Notification(title, {
      body,
      icon: "/icon.png",
    });

    if (url && typeof window !== "undefined") {
      notification.onclick = () => {
        window.focus();
        window.location.href = url;
      };
    }
  });

  return token;
};
