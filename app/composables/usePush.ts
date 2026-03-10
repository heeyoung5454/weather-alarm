import { getToken, onMessage } from "firebase/messaging";

export const usePush = async () => {
  const { $messaging } = useNuxtApp();

  if (!$messaging) return;

  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("알림 권한 거부");
      return;
    }

    const token = await getToken($messaging, {
      vapidKey: "BCUIMngW07B5in35GHdHxKrJmN7rYz0HGgmvE555wVdt3kRYFfqTXivntZ_0Uokt0EY5P77ld7qK-apjAjzUUTc",
    });

    console.log("FCM TOKEN:", token);

    // 🔔 웹이 열려있을 때 메시지 수신
    onMessage($messaging, (payload) => {
      console.log("푸시 수신:", payload);

      const title = payload.notification?.title ?? "테스트";
      const body = payload.notification?.body ?? "푸시 메시지";

      new Notification(title, {
        body: body,
      });
    });

    return token;
  } catch (error) {
    console.error("푸시 토큰 에러", error);
  }
};
