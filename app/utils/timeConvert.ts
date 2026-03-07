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
