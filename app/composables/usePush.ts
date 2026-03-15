import { getApp } from "firebase/app";
import { getToken, isSupported, getMessaging } from "firebase/messaging";

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

  return token;
};
