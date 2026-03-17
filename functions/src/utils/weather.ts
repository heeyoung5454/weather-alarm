import axios from 'axios';

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
  nx: number,
  ny: number,
  baseDate: string,
  baseTime: string,
) => {
  const serviceKey = process.env.WEATHER_API_KEY;

  const url =
    'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

  const res = await axios.get(url, {
    params: {
      serviceKey,
      numOfRows: 1000,
      pageNo: 1,
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx,
      ny,
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
