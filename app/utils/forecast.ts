export interface ForecastItem {
  fcstDate: string;
  fcstTime: string;
  category: string;
  fcstValue: string;
}

// 날짜별 그룹화
export const groupByDate = (items: ForecastItem[]) => {
  const daily: Record<string, ForecastItem[]> = {};
  items.forEach((item) => {
    if (!daily[item.fcstDate]) daily[item.fcstDate] = [];
    daily[item.fcstDate].push(item);
  });
  return daily;
};

// 하루 요약 (최고/최저 온도, 하늘상태, 강수확률)
export const summarizeDay = (items: ForecastItem[]) => {
  const temps = items.filter((i) => i.category === "TMP").map((i) => Number(i.fcstValue));
  const skies = items.filter((i) => i.category === "SKY").map((i) => i.fcstValue);
  const pops = items.filter((i) => i.category === "POP").map((i) => Number(i.fcstValue));

  return {
    date: items[0].fcstDate,
    minTemp: Math.min(...temps),
    maxTemp: Math.max(...temps),
    sky: skies[Math.floor(skies.length / 2)], // 대표 하늘상태
    pop: Math.max(...pops), // 최대 강수확률
  };
};
