import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

export const sendWeatherAlarm = functions.pubsub
  .schedule("* * * * *") // 매 1분
  .timeZone("Asia/Seoul")
  .onRun(async () => {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");

    console.log("현재시간", currentTime);

    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();

      if (!user.fcmToken) continue;
      if (!user.alarms) continue;

      for (const alarm of user.alarms) {
        if (!alarm.enabled) continue;

        if (alarm.time === currentTime) {
          const message = {
            token: user.fcmToken,
            notification: {
              title: "오늘 날씨 알림 ☀️",
              body: `${alarm.region} 날씨 확인하세요`,
            },
            data: {
              region: alarm.region,
            },
          };

          try {
            await admin.messaging().send(message);
            console.log("푸시 전송 완료", user.email);
          } catch (e) {
            console.error("푸시 실패", e);
          }
        }
      }
    }

    return null;
  });
