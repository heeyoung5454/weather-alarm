import { getToken } from "firebase/messaging";

export const usePush = async () => {
  const { $messaging } = useNuxtApp();

  if (!$messaging) {
    console.log("Firebase Messaging not initialized");
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    console.log("알림 거부");
    return;
  }

  const token = await getToken($messaging, {
    vapidKey: "BCUIMngW07B5in35GHdHxKrJmN7rYz0HGgmvE555wVdt3kRYFfqTXivntZ_0Uokt0EY5P77ld7qK-apjAjzUUTc",
  });

  console.log("FCM TOKEN:", token);

  return token;
};
