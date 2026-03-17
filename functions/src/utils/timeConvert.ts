/**
 * 단기예보조회 기준 날짜/시간 조회
 * - 기상청 기준 시간: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300
 * - 00시~00:44는 전날 23시 기준으로
 * @return {{ baseDate: string, baseTime: string }}
 */
export const getVilageFcstBaseDateTime = () => {
  const now = new Date();
  let baseTimeHour = now.getHours();
  const minutes = now.getMinutes();

  const times = [2, 5, 8, 11, 14, 17, 20, 23];

  if (baseTimeHour === 0 && minutes < 45) {
    now.setDate(now.getDate() - 1);
    baseTimeHour = 23;
  } else {
    if (minutes < 45) {
      baseTimeHour -= 1;
    }
    let t = times.filter((t) => t <= baseTimeHour).pop();
    if (!t) {
      now.setDate(now.getDate() - 1);
      t = 23;
    }
    baseTimeHour = t;
  }

  const baseDate =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0');

  const baseTime = baseTimeHour.toString().padStart(2, '0') + '00';

  return { baseDate, baseTime };
};

