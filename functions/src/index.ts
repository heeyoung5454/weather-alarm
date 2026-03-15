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
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = parts.find((p) => p.type === 'hour')?.value.padStart(2, '0') ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value.padStart(2, '0') ?? '00';
    const currentTime = `${hour}:${minute}`;

    const snapshot = await db
      .collection('alarms')
      .where('time', '==', currentTime)
      .where('enabled', '==', true)
      .get();

    for (const doc of snapshot.docs) {
      const alarm = doc.data();

      if (!alarm.token) continue;

      console.log('푸시 대상 토큰:', alarm.token);

      await admin.messaging().send({
        token: alarm.token,
        notification: {
          title: '오늘 날씨 알림',
          body: `${alarm.region} 날씨 확인하세요`,
        },
      });

      console.log('푸시 보냄', alarm.region);
    }
  },
);
