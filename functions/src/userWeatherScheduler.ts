import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { getVilageFcstItems } from './utils/weather';
import { getVilageFcstBaseDateTime } from './utils/timeConvert';

type ForecastWeather = {
  sky: string;
  rain: number;
  temp: number;
};

const WEATHER_API_KEY = defineSecret('WEATHER_API_KEY');

/**
 * 👤 사용자 위치 기준 날씨 캐싱 스케줄러
 * - users 컬렉션의 lat/lng 기준으로 단기예보를 조회해 3시간 뒤 예보를 users.Forecast에 저장한다.
 */
export const cacheUserWeather = onSchedule(
  {
    schedule: '0 * * * *', // 1시간마다 실행
    timeZone: 'Asia/Seoul',
    secrets: [WEATHER_API_KEY],
  },
  async () => {
    console.log('👤 사용자 기준 날씨 캐싱 시작');

    const db = admin.firestore();

    try {
      const usersSnap = await db.collection('users').get();

      await Promise.all(
        usersSnap.docs.map(async (doc) => {
          const data = doc.data();
          const uid = doc.id;

          const lat = data.lat;
          const lng = data.lng;

          if (lat === undefined || lng === undefined) {
            return;
          }

          try {
            const { baseDate, baseTime } = getVilageFcstBaseDateTime();
            const items = await getVilageFcstItems(
              lat,
              lng,
              baseDate,
              baseTime,
              WEATHER_API_KEY.value(),
            );

            // KST 기준 +3시간 뒤를 3시간 슬롯(00,03,06...)으로 맞춘다.
            const now = new Date();
            const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
            kst.setUTCHours(kst.getUTCHours() + 3);
            const targetHour = Math.ceil(kst.getUTCHours() / 3) * 3;
            if (targetHour >= 24) {
              kst.setUTCDate(kst.getUTCDate() + 1);
            }
            const normalizedHour = targetHour % 24;
            const targetDate =
              kst.getUTCFullYear().toString() +
              (kst.getUTCMonth() + 1).toString().padStart(2, '0') +
              kst.getUTCDate().toString().padStart(2, '0');
            const targetTime =
              normalizedHour.toString().padStart(2, '0') + '00';

            let sky = '';
            let rain = '0';
            let temp = '';

            items.forEach((item) => {
              if (
                item.fcstDate !== targetDate ||
                item.fcstTime !== targetTime
              ) {
                return;
              }

              if (item.category === 'SKY') sky = item.fcstValue ?? sky;
              if (item.category === 'PTY') rain = item.fcstValue ?? rain;
              if (item.category === 'TMP') temp = item.fcstValue ?? temp;
            });

            const forecast: ForecastWeather = {
              sky,
              rain: Number(rain),
              temp: Number(temp),
            };

            await db.collection('users').doc(uid).set(
              {
                Forecast: forecast,
              },
              { merge: true },
            );

            // 요청 조건: 3시간 뒤 강수(PTY)가 있으면 푸시 전송
            const isPushEnabled = data.isPush === true;

            // users.fcmTokens 배열 (enabled인 항목만)
            const tokensFromArray: string[] = Array.isArray(data.fcmTokens) ?
              data.fcmTokens
                  .flatMap((t: unknown) => {
                    if (typeof t === "string") return t.trim().length > 0 ? [t] : [];
                    if (t && typeof t === "object" && "token" in t) {
                      const obj = t as { token?: unknown; enabled?: unknown };
                      const token = typeof obj.token === "string" ? obj.token.trim() : "";
                      // enabled 값이 없으면 true로 취급
                      const enabled = typeof obj.enabled === "boolean" ? obj.enabled : true;
                      return token.length > 0 && enabled ? [token] : [];
                    }
                    return [];
                  })
                  .filter((t: unknown) => typeof t === "string" && t.trim().length > 0) :
              [];
            const tokens = Array.from(new Set(tokensFromArray));

            if (forecast.rain > 0 && tokens.length > 0 && isPushEnabled) {
              await Promise.all(
                tokens.map((token) =>
                  admin.messaging().send({
                    token,
                    notification: {
                      title: '강수 알림',
                      body: '3시간 뒤 비가 올 예정입니다.',
                    },
                    data: {
                      type: 'forecast_rain',
                      rain: String(forecast.rain),
                    },
                  })
                )
              );
            }

            console.log(`✅ 사용자 ${uid} Forecast 저장 완료`);
          } catch (err) {
            console.error(`❌ 사용자 ${uid} Forecast 캐싱 실패`, err);
          }
        }),
      );

      console.log('👤 전체 사용자 Forecast 캐싱 완료');
    } catch (err) {
      console.error('🔥 사용자 Forecast 스케줄러 실패', err);
    }
  },
);
