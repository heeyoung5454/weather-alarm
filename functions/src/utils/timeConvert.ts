/**
 * 단기예보조회 기준 날짜/시간 조회
 * - 기상청 기준 시간: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300
 * - 00시~00:44는 전날 23시 기준으로
 * @return {{ baseDate: string, baseTime: string }}
 */
export const getVilageFcstBaseDateTime = () => {
  // Cloud Functions 런타임은 UTC일 수 있어 KST로 계산한다.
  const now = new Date();
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  // kst Date 객체를 만들고 UTC getter로 값을 꺼내면 KST 값이 된다.
  const kst = new Date(kstMs);

  let baseTimeHour = kst.getUTCHours();
  const minutes = kst.getUTCMinutes();

  const times = [2, 5, 8, 11, 14, 17, 20, 23];

  // baseDate 계산을 위해 kst 기준 날짜 객체를 유지한다.
  if (baseTimeHour === 0 && minutes < 45) {
    kst.setUTCDate(kst.getUTCDate() - 1);
    baseTimeHour = 23;
  } else {
    if (minutes < 45) {
      baseTimeHour -= 1;
    }
    let t = times.filter((t) => t <= baseTimeHour).pop();
    if (!t) {
      kst.setUTCDate(kst.getUTCDate() - 1);
      t = 23;
    }
    baseTimeHour = t;
  }

  const baseDate =
    kst.getUTCFullYear().toString() +
    (kst.getUTCMonth() + 1).toString().padStart(2, '0') +
    kst.getUTCDate().toString().padStart(2, '0');

  const baseTime = baseTimeHour.toString().padStart(2, '0') + '00';

  return { baseDate, baseTime };
};

/**
 * 초단기 실황 조회 기준 날짜/시간 조회
 * - 기상청 데이터 지연(10~15분) 감안해 안전하게 20분 이전 시간대 사용
 * @return {{ baseDate: string, baseTime: string }}
 */
export const getUltraSrtBaseDateTime = () => {
  // Cloud Functions 런타임은 UTC일 수 있어 KST로 계산한다.
  const now = new Date();
  let kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  let kst = new Date(kstMs);

  const delayMinutes = 20;
  if (kst.getUTCMinutes() < delayMinutes) {
    kstMs -= 60 * 60 * 1000;
    kst = new Date(kstMs);
  }

  const baseDate =
    kst.getUTCFullYear().toString() +
    (kst.getUTCMonth() + 1).toString().padStart(2, '0') +
    kst.getUTCDate().toString().padStart(2, '0');
  const baseTime = kst.getUTCHours().toString().padStart(2, '0') + '00';

  return { baseDate, baseTime };
};

