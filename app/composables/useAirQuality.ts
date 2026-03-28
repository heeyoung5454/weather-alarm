import { getRegionName } from "../utils/reverseGeo";
import { sidoFromLatLngFallback, sidoFromNominatimAddress } from "../utils/airKoreaSido";

const AIR_API = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty";

function normalizeServiceKey(serviceKey: string) {
  let normalizedKey = serviceKey;
  try {
    normalizedKey = decodeURIComponent(serviceKey);
  } catch {
    /* keep */
  }
  return normalizedKey;
}

/**
 * 에어코리아 응답값에 따른 변환
 * - `items: [ { item: [ {...측정소}, ... ] } ]` 이거나
 * - `items: [ {...측정소}, ... ]` 처럼 측정소 객체 배열
 */
function normalizeItems(body: { items?: unknown }): Record<string, unknown>[] {
  const raw = body?.items;
  if (raw == null || raw === "") return [];

  if (!Array.isArray(raw)) {
    const obj = raw as { item?: unknown };
    if (Array.isArray(obj.item)) return obj.item as Record<string, unknown>[];
    if (obj.item != null && typeof obj.item === "object") return [obj.item as Record<string, unknown>];
    return [];
  }

  if (raw.length === 0) return [];
  const first = raw[0] as Record<string, unknown>;

  if ("item" in first) {
    const item = first.item;
    if (item == null) return [];
    return Array.isArray(item) ? (item as Record<string, unknown>[]) : [item as Record<string, unknown>];
  }

  if ("stationName" in first || "pm10Value" in first || "pm25Value" in first || "dataTime" in first) {
    return raw as Record<string, unknown>[];
  }

  return [];
}

function parsePmValue(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "" || s === "-") return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function aggregatePm(items: Record<string, unknown>[]) {
  let s10 = 0,
    c10 = 0,
    s25 = 0,
    c25 = 0;
  for (const it of items) {
    const p10 = parsePmValue(it.pm10Value);
    const p25 = parsePmValue(it.pm25Value);
    if (p10 != null) {
      s10 += p10;
      c10++;
    }
    if (p25 != null) {
      s25 += p25;
      c25++;
    }
  }
  return {
    pm10Avg: c10 ? Math.round(s10 / c10) : null,
    pm25Avg: c25 ? Math.round(s25 / c25) : null,
    stationCount: items.length,
  };
}

export function gradePm10(v: number): string {
  if (v <= 30) return "좋음";
  if (v <= 80) return "보통";
  if (v <= 150) return "나쁨";
  return "매우 나쁨";
}

export function gradePm25(v: number): string {
  if (v <= 15) return "좋음";
  if (v <= 35) return "보통";
  if (v <= 75) return "나쁨";
  return "매우 나쁨";
}

export type AirQualitySummary = {
  sido: string;
  pm10: number | null;
  pm25: number | null;
  gradePm10: string | null;
  gradePm25: string | null;
  stationCount: number;
};

/**
 * 위·경도 기준 시도 추정 후 시도별 실시간 측정 평균(측정소별 값의 산술평균, 결측 제외)
 */
export async function fetchAirQualityByCoords(lat: number, lng: number): Promise<AirQualitySummary | null> {
  const config = useRuntimeConfig();
  const key = config.public.airKoreaKey as string | undefined;
  if (!key || typeof key !== "string" || !key.trim()) return null;

  let sido = "";
  try {
    const geo = await getRegionName(lat, lng);
    sido = sidoFromNominatimAddress(geo) || "";
  } catch {
    sido = "";
  }
  if (!sido) sido = sidoFromLatLngFallback(lat, lng);

  const serviceKey = normalizeServiceKey(key.trim());

  const res: any = await $fetch(AIR_API, {
    query: {
      serviceKey,
      returnType: "json",
      numOfRows: 500,
      pageNo: 1,
      sidoName: sido,
      ver: "1.0",
    },
  });

  const header = res?.response?.header;
  const resultCode = header?.resultCode != null ? String(header.resultCode).trim() : "";
  if (resultCode && resultCode !== "00") {
    console.warn("에어코리아 API:", header.resultMsg || resultCode);
    return null;
  }

  const body = res?.response?.body;
  const items = normalizeItems(body ?? {});
  const { pm10Avg, pm25Avg, stationCount } = aggregatePm(items);

  return {
    sido,
    pm10: pm10Avg,
    pm25: pm25Avg,
    gradePm10: pm10Avg != null ? gradePm10(pm10Avg) : null,
    gradePm25: pm25Avg != null ? gradePm25(pm25Avg) : null,
    stationCount,
  };
}
