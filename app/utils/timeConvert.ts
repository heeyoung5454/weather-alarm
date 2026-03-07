/**
 * 기준 날짜/시간 조회 (기상청 API 특성상 보통 10~15분 뒤 데이터가 생성)
 * @returns
 */
export const getBaseDateTime = () => {
  const now = new Date();

  let hour = now.getHours();
  const minute = now.getMinutes();

  if (minute < 20) {
    now.setHours(now.getHours() - 1);
  }

  const baseDate = now.toISOString().slice(0, 10).replace(/-/g, "");
  const baseTime = String(now.getHours()).padStart(2, "0") + "00";

  return { baseDate, baseTime };
};

// 초단기예보용 baseTime 계산 (서버 반영 완료 시각 기준)
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
