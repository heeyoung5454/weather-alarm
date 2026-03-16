import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const alarmPush = onSchedule(
  {
    schedule: '0-59/5 * * * *',
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

    const baseUrl = 'https://weatheralarm-155bf.web.app';
    for (const doc of snapshot.docs) {
      const alarm = doc.data();
      const region = alarm.region || '서울';

      if (!alarm.token) continue;

      const url = `${baseUrl}/alarm/notiWeather?region=${encodeURIComponent(region)}`;
      console.log('푸시 대상 토큰:', alarm.token, '지역:', region);

      await admin.messaging().send({
        token: alarm.token,
        notification: {
          title: '오늘 날씨 알림',
          body: `${region} 날씨 확인하세요`,
        },
        data: {
          url,
          region,
        },
      });

      console.log('푸시 보냄', region);
    }
  },
);
