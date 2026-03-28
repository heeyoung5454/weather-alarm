import { doc, getDoc, setDoc } from "firebase/firestore";
import { formatKoreanAddressLine, getRegionName } from "../utils/reverseGeo";

export type UserRegionEntry = {
  lat: number;
  lng: number;
  savedAt?: unknown;
  /** 역지오코딩 한 줄 주소 */
  label?: string;
};

const coordKey = (lat: number, lng: number) =>
  `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;

const normalizeLabelKey = (s: string) => s.replace(/\s+/g, " ").trim();

/** 같은 주소 문자열이 다른 행에 이미 있는지 (같은 인덱스는 제외) */
const hasDuplicateLabelElsewhere = (existing: UserRegionEntry[], label: string, exceptIndex: number): boolean => {
  const key = normalizeLabelKey(label);
  if (!key) return false;
  return existing.some((e, i) => {
    if (i === exceptIndex) return false;
    if (typeof e?.label !== "string") return false;
    return normalizeLabelKey(e.label) === key;
  });
};

/**
 * GPS로 확정된 위치를 userRegions/{uid} 문서의 regions 배열에 반영한다.
 * 역지오코딩 label을 함께 저장한다.
 * 동일 label이 이미 있으면 저장하지 않는다.
 * 동일 좌표(소수 5자리)만 겹치면 savedAt·label만 갱신한다.
 */
export async function pushUserRegion(uid: string, coords: { lat: number; lng: number }) {
  if (!uid || typeof coords.lat !== "number" || typeof coords.lng !== "number") return;

  const { $db } = useNuxtApp();
  const ref = doc($db, "userRegions", uid);
  const snap = await getDoc(ref);
  const existing: UserRegionEntry[] = Array.isArray(snap.data()?.regions) ? snap.data()!.regions : [];

  let label = "";
  try {
    const res = await getRegionName(coords.lat, coords.lng);
    label = formatKoreanAddressLine(res).trim();
  } catch {
    label = "";
  }

  const k = coordKey(coords.lat, coords.lng);
  const now = new Date();
  const idx = existing.findIndex(
    (e) => e && typeof e.lat === "number" && typeof e.lng === "number" && coordKey(e.lat, e.lng) === k,
  );

  if (label && hasDuplicateLabelElsewhere(existing, label, idx)) {
    return;
  }

  let regions: UserRegionEntry[];
  if (idx >= 0) {
    regions = existing.map((e, i) =>
      i === idx
        ? {
            ...e,
            lat: coords.lat,
            lng: coords.lng,
            savedAt: now,
            label: label || e.label,
          }
        : e,
    );
  } else {
    regions = [...existing, { lat: coords.lat, lng: coords.lng, savedAt: now, ...(label ? { label } : {}) }];
  }

  await setDoc(
    ref,
    {
      uid,
      regions,
      updatedAt: now,
    },
    { merge: true },
  );
}
