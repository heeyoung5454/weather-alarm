/**
 * Asia/Seoul 기준 요일을 반환한다.
 * @param {Date} date 기준 시각
 * @return {number} 0=일 … 6=토 (Date#getDay()와 동일)
 */
export function getSeoulWeekday0To6(date: Date): number {
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[wd] ?? 0;
}

/**
 * 알람 문서의 weekdays 배열을 정규화한다.
 * @param {unknown} weekdays Firestore 필드
 * @return {number[]} 선택된 요일 (0~6), 없거나 비어 있으면 매일
 */
export function normalizeAlarmWeekdays(weekdays: unknown): number[] {
  if (!Array.isArray(weekdays) || weekdays.length === 0) {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  const nums = weekdays.filter(
    (x): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 6,
  );
  if (nums.length === 0) return [0, 1, 2, 3, 4, 5, 6];
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}
