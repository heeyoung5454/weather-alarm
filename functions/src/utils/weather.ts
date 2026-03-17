import axios from 'axios';
import { dfsXyConv } from './dfsXyConv';

type VilageFcstItem = { category: string; fcstValue: string };
type VilageFcstResponse = {
  response?: {
    body?: {
      items?: {
        item?: VilageFcstItem[];
      };
    };
  };
};

export const getVilageFcst = async (
  lat: number,
  lon: number,
  baseDate: string,
  baseTime: string,
  serviceKey: string,
) => {
  // data.go.kr serviceKey가 이미 URL-encode된 값일 수 있어, axios에서 재인코딩되면 인증 실패(401)할 수 있다.
  // 가능하면 decode 후 사용한다.
  let normalizedKey = serviceKey;
  try {
    normalizedKey = decodeURIComponent(serviceKey);
  } catch {
    // 원본 유지
  }
  const grid = dfsXyConv('toXY', lat, lon);

  const url =
    'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

  const res = await axios.get(url, {
    params: {
      serviceKey: normalizedKey,
      numOfRows: 1000,
      pageNo: 1,
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx: grid.x,
      ny: grid.y,
    },
  });

  const items = (res.data as unknown as VilageFcstResponse)?.response?.body
    ?.items?.item;
  if (!Array.isArray(items)) {
    throw new Error('Invalid weather response');
  }

  let temp = '';
  let sky = '';
  let rain = '';

  items.forEach((item) => {
    if (item.category === 'TMP') temp = item.fcstValue;
    if (item.category === 'SKY') sky = item.fcstValue;
    if (item.category === 'PTY') rain = item.fcstValue;
  });

  const skyMap: Record<string, string> = {
    '1': '맑음',
    '3': '구름많음',
    '4': '흐림',
  };

  const rainMap: Record<string, string> = {
    '0': '없음',
    '1': '비',
    '2': '비/눈',
    '3': '눈',
    '4': '소나기',
  };

  return {
    temp: Number(temp),
    sky: rain !== '0' ? rainMap[rain] : skyMap[sky],
    rain: Number(rain),
  };
};
