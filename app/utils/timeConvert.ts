/**
 * 초단기 실황 조회 기준 날짜/시간 조회 (기상청 API 특성상 보통 10~15분 뒤 데이터가 생성)
 * @returns
 */
export const getBaseDateTime = () => {
  const now = new Date();

  // 10~15분 정도의 데이터 지연 감안
  const delayMinutes = 20;
  if (now.getMinutes() < delayMinutes) {
    now.setHours(now.getHours() - 1);
  }

  const baseDate = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, "0") + now.getDate().toString().padStart(2, "0");

  const baseTime = now.getHours().toString().padStart(2, "0") + "00";

  return { baseDate, baseTime };
};

/**
 * 초단기예보용 baseTime 계산 (서버 반영 완료 시각 기준)
 * @returns
 */
export const getFcstBaseTime = () => {
  const now = new Date();

  // 기상청 기준은 30분 단위로 발표, 서버 반영까지 약간 지연 있음
  // 안전하게 현재 시간보다 40분 이전 기준으로 잡음
  now.setMinutes(now.getMinutes() - 40);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");

  // 분 단위는 초단기예보 기준 시간에 맞춰 1시간 단위
  // 예: 21:20 → baseTime = 21:00
  const fctBaseTime = hour + "00";
  const fctBaseDate = `${year}${month}${day}`;

  return { fctBaseDate, fctBaseTime };
};

/**
 * 단기예보조회 기준 날짜/시간 조회
 * @returns
 */
export const getVilageFcstBaseDateTime = () => {
  const now = new Date();
  let baseTimeHour = now.getHours();
  const minutes = now.getMinutes();

  // 단기예보 기준 시간: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300
  const times = [2, 5, 8, 11, 14, 17, 20, 23];

  // 00시~00:44는 전날 23시 기준으로
  if (baseTimeHour === 0 && minutes < 45) {
    now.setDate(now.getDate() - 1); // 날짜를 하루 뒤로
    baseTimeHour = 23;
  } else {
    if (minutes < 45) {
      baseTimeHour -= 1;
    }
    let t = times.filter((t) => t <= baseTimeHour).pop();
    if (!t) {
      // 00시~01시 등 이전날 기준
      now.setDate(now.getDate() - 1);
      t = 23;
    }
    baseTimeHour = t;
  }

  const baseDate = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, "0") + now.getDate().toString().padStart(2, "0");

  const baseTimeStr = baseTimeHour.toString().padStart(2, "0") + "00";

  return { baseDate, baseTime: baseTimeStr };
};
