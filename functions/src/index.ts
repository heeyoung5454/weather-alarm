import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

admin.initializeApp();

export { cacheRegionWeather } from './weatherScheduler';
export { cacheUserWeather } from './userWeatherScheduler';

export const alarmPush = onSchedule(
  {
    schedule: '0-59/5 * * * *', // 5분마다 실행
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
    const hour =
      parts.find((p) => p.type === 'hour')?.value.padStart(2, '0') ?? '00';
    const minute =
      parts.find((p) => p.type === 'minute')?.value.padStart(2, '0') ?? '00';
    const currentTime = `${hour}:${minute}`;

    const snapshot = await db
      .collection('alarms')
      .where('time', '==', currentTime)
      .where('enabled', '==', true)
      .get();

    const baseUrl = 'https://weatheralarm-155bf.web.app';

    // alarms 문서는 uid당 여러 토큰(users.fcmTokens)을 통해 모두 전송하도록 변경
    const uidSet = new Set<string>();
    snapshot.docs.forEach((d) => {
      const alarm = d.data();
      if (typeof alarm.uid === 'string' && alarm.uid.trim().length > 0) {
        uidSet.add(alarm.uid);
      }
    });

    const uids = Array.from(uidSet);
    const userDocs = await Promise.all(
      uids.map((uid) => db.collection('users').doc(uid).get())
    );

    const uidToTokens = new Map<string, string[]>();
    userDocs.forEach((snap, idx) => {
      const uid = uids[idx];
      const data = snap.data() || {};
      const tokensFromArray: string[] = Array.isArray(data.fcmTokens) ?
        data.fcmTokens
            .flatMap((t: unknown) => {
              if (typeof t === "string") return t.trim().length > 0 ? [t] : [];
              if (t && typeof t === "object" && "token" in t) {
                const obj = t as { token?: unknown; enabled?: unknown };
                const token = typeof obj.token === "string" ? obj.token.trim() : "";
                const enabled = typeof obj.enabled === "boolean" ? obj.enabled : true;
                return token.length > 0 && enabled ? [token] : [];
              }
              return [];
            })
            .filter((t: unknown) => typeof t === "string" && t.trim().length > 0) :
        [];
      const tokens = Array.from(new Set(tokensFromArray));
      uidToTokens.set(uid, tokens);
    });

    for (const doc of snapshot.docs) {
      const alarm = doc.data();
      const region = alarm.region || '서울';
      const uid = alarm.uid;

      const tokens = typeof uid === 'string' ? uidToTokens.get(uid) || [] : [];
      if (tokens.length === 0) continue;

      const url = `${baseUrl}/alarm/notiWeather?region=${encodeURIComponent(region)}`;

      await Promise.all(
        tokens.map((token) =>
          admin.messaging().send({
            token,
            notification: {
              title: '오늘 날씨 알림',
              body: `${region} 날씨 확인하세요`,
            },
            data: {
              url,
              region,
            },
          })
        )
      );
    }
  },
);
