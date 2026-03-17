import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { getVilageFcst } from './utils/weather';
import { getVilageFcstBaseDateTime } from './utils/timeConvert';

type CachedWeather = {
  temp: number;
  sky: string;
  rain: number;
};

const WEATHER_API_KEY = defineSecret('WEATHER_API_KEY');

/**
 * 🌦 날씨 캐싱 스케줄러
 */
export const cacheRegionWeather = onSchedule(
  {
    schedule: '*/30 * * * *', // 30분마다 실행
    timeZone: 'Asia/Seoul',
    secrets: [WEATHER_API_KEY],
  },
  async () => {
    console.log('🌦 날씨 캐싱 시작');

    const db = admin.firestore();

    try {
      const regionSnap = await db.collection('regions').get();

      await Promise.all(
        regionSnap.docs.map(async (doc) => {
          const data = doc.data();

          const name = doc.id; // 👉 doc.id 사용 추천
          const lat = data.lat;
          const lon = data.lon;

          if (!name || lat === undefined || lon === undefined) {
            console.warn('❗ 잘못된 region 데이터:', doc.id, data);
            return;
          }

          try {
            const { baseDate, baseTime } = getVilageFcstBaseDateTime();
            const weather = (await getVilageFcst(
              lat,
              lon,
              baseDate,
              baseTime,
              WEATHER_API_KEY.value(),
            )) as CachedWeather;

            // undefined 제거
            const cleanedWeather = Object.fromEntries(
              Object.entries(weather).filter(([, v]) => v !== undefined),
            );

            await db
              .collection('regionWeatherCache')
              .doc(name)
              .set({
                ...cleanedWeather,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

            console.log(`✅ ${name} 저장 완료`);
          } catch (err) {
            console.error(`❌ ${name} 실패`, err);
          }
        }),
      );

      console.log(' 전체 날씨 캐싱 완료');
    } catch (err) {
      console.error('🔥 스케줄러 실패', err);
    }
  },
);
