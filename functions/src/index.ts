import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const alarmPush = onSchedule(
  {
    schedule: '* * * * *',
    timeZone: 'Asia/Seoul',
  },
  async () => {
    const db = admin.firestore();

    const now = new Date();

    const hour = now.getHours().toString().padStart(2, '0');
    const min = now.getMinutes().toString().padStart(2, '0');

    const currentTime = `${hour}:${min}`;

    console.log('현재시간', currentTime);

    const snapshot = await db.collection('alarms').where('time', '==', currentTime).where('enabled', '==', true).get();

    for (const doc of snapshot.docs) {
      const alarm = doc.data();

      if (!alarm.token) continue;

      await admin.messaging().send({
        token: alarm.token,
        notification: {
          title: '오늘 날씨 알림',
          body: `${alarm.region} 날씨 확인하세요`,
        },
      });
    }
  }
);
