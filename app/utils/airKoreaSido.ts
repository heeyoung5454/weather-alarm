/** 에어코리아 getCtprvnRltmMesureDnsty 의 sidoName 값 */
export const AIR_KOREA_SIDO = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;

/**
 * Nominatim reverse 결과에서 시도명(에어코리아용) 추출
 */
export function sidoFromNominatimAddress(res: unknown): string | null {
  const a = (res as { address?: Record<string, string> })?.address;
  if (!a || typeof a !== "object") return null;
  const parts = [a.state, a.province, a.region, a.city, a.city_district, a.county, a.municipality].filter(
    (x): x is string => typeof x === "string" && x.length > 0,
  );
  const t = parts.join(" ");

  if (/세종특별자치시|세종시/i.test(t)) return "세종";
  if (/제주특별자치도|제주시|서귀포/i.test(t)) return "제주";
  if (/서울특별시|서울/i.test(t)) return "서울";
  if (/부산광역시|부산/i.test(t)) return "부산";
  if (/대구광역시|대구/i.test(t)) return "대구";
  if (/인천광역시|인천/i.test(t)) return "인천";
  if (/경기도/.test(t) && /광주시/.test(t) && !/광주광역시/.test(t)) return "경기";
  if (/광주광역시/i.test(t)) return "광주";
  if (/대전광역시|대전/i.test(t)) return "대전";
  if (/울산광역시|울산/i.test(t)) return "울산";
  if (/경기도|경기/i.test(t)) return "경기";
  if (/강원특별자치도|강원도|강원/i.test(t)) return "강원";
  if (/충청북도|충북/i.test(t)) return "충북";
  if (/충청남도|충남/i.test(t)) return "충남";
  if (/전북특별자치도|전라북도|전북/i.test(t)) return "전북";
  if (/전라남도|전남/i.test(t)) return "전남";
  if (/경상북도|경북/i.test(t)) return "경북";
  if (/경상남도|경남/i.test(t)) return "경남";

  return null;
}

/** 역지오 실패 시 위·경도로 대략 시도 추정 (한반도) */
export function sidoFromLatLngFallback(lat: number, lng: number): string {
  if (lat >= 33 && lat <= 34.2 && lng >= 126 && lng <= 127.2) return "제주";
  if (lat >= 37.35 && lat <= 37.75 && lng >= 126.7 && lng <= 127.25) return "서울";
  if (lat >= 35 && lat <= 35.4 && lng >= 128.9 && lng <= 129.3) return "부산";
  if (lat >= 35.7 && lat <= 36 && lng >= 128.4 && lng <= 128.8) return "대구";
  if (lat >= 37.35 && lat <= 37.55 && lng >= 126.5 && lng <= 126.85) return "인천";
  return "서울";
}
