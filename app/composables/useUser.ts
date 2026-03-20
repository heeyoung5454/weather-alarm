import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

type Coords = { lat: number; lng: number };

type DeviceMeta = {
  ua?: string; // 짧게 잘라서 저장
  platform?: string;
  lang?: string;
  tz?: string;
  screen?: string; // 예: 390x844
  dpr?: number;
};

type FcmTokenEntry = {
  token: string;
  meta?: DeviceMeta;
  enabled?: boolean;
};

const getDeviceMeta = (): DeviceMeta => {
  // ssr가 꺼져 있으므로 보통 client에서만 실행되지만, 안전하게 가드합니다.
  if (typeof window === "undefined" || typeof navigator === "undefined") return {};

  const uaRaw = navigator.userAgent || "";
  const ua = uaRaw.length > 140 ? uaRaw.slice(0, 140) + "..." : uaRaw;

  // Chrome의 userAgentData가 있는 경우 플랫폼을 더 안정적으로 가져옵니다.
  // @ts-ignore
  const uaData = navigator.userAgentData as { platform?: string } | undefined;
  const platform = uaData?.platform ?? navigator.platform ?? "";

  const lang = navigator.language ?? "";

  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // ignore
  }

  const screenSize =
    typeof window.screen?.width === "number" && typeof window.screen?.height === "number"
      ? `${window.screen.width}x${window.screen.height}`
      : "";

  const dpr = typeof window.devicePixelRatio === "number" ? window.devicePixelRatio : undefined;

  return { ua, platform, lang, tz, screen: screenSize, dpr };
};

const normalizeFcmTokens = (raw: any): FcmTokenEntry[] => {
  if (!Array.isArray(raw)) return [];

  const out: FcmTokenEntry[] = [];
  for (const t of raw) {
    if (typeof t === "string") {
      const token = t.trim();
      if (token) out.push({ token, meta: {}, enabled: true });
      continue;
    }
    if (t && typeof t === "object" && typeof t.token === "string") {
      const token = t.token.trim();
      if (token)
        out.push({
          token,
          meta: t.meta ?? {},
          enabled: typeof t.enabled === "boolean" ? t.enabled : true,
        });
    }
  }
  return out;
};

const upsertTokenEntry = (existing: FcmTokenEntry[], next: FcmTokenEntry) => {
  const nextToken = next.token;
  const idx = existing.findIndex((e) => e.token === nextToken);
  if (idx === -1) return [...existing, next];
  const merged: FcmTokenEntry = {
    token: nextToken,
    meta: { ...(existing[idx]?.meta ?? {}), ...(next.meta ?? {}) },
    // 기존 enabled 상태를 우선 유지 (사용자가 끈 경우에도 계속 유지)
    enabled: typeof existing[idx]?.enabled === "boolean" ? existing[idx].enabled : next.enabled ?? true,
  };
  return existing.map((e, i) => (i === idx ? merged : e));
};

export const saveUser = async (user: any, token: string, coords?: Coords) => {
  const { $db } = useNuxtApp();

  const ref = doc($db, "users", user.uid);

  const snapshot = await getDoc(ref);

  const hasToken = typeof token === "string" && token.trim().length > 0;
  const trimmedToken = hasToken ? token.trim() : "";

  const deviceEntry: FcmTokenEntry | null = hasToken
    ? {
        token: trimmedToken,
        meta: getDeviceMeta(),
        enabled: true,
      }
    : null;

  const baseData: any = {};
  if (coords) {
    baseData.lat = coords.lat;
    baseData.lng = coords.lng;
  }

  if (!snapshot.exists()) {
    if (deviceEntry) {
      baseData.fcmTokens = [deviceEntry];
      // 레거시 호환용
      baseData.fcmToken = deviceEntry.token;
    }
  }

  if (!snapshot.exists()) {
    await setDoc(
      ref,
      {
      email: user.email,
      name: user.displayName,
      isPush: false,
      createdAt: new Date(),
      ...baseData,
      ...(hasToken ? {} : {}),
      ...(deviceEntry ? {} : {}),
    },
      { merge: true }
    );

    console.log("새 사용자 생성");
  } else {
    const current = snapshot.data() || {};

    // 기존 fcmTokens가 string[] / object[] / 없음 / legacy fcmToken만 있을 수 있음
    const legacyToken =
      typeof current?.fcmToken === "string" && current.fcmToken.trim().length > 0 ? current.fcmToken.trim() : "";

    let nextFcmTokens: FcmTokenEntry[] = [];

    if (Array.isArray(current?.fcmTokens)) {
      nextFcmTokens = normalizeFcmTokens(current.fcmTokens);
    } else if (legacyToken) {
      nextFcmTokens = [{ token: legacyToken, meta: {}, enabled: true }];
    }

    if (deviceEntry) {
      // 기존에 들어있던 레거시 fcmToken도 token 중복 제거로 함께 반영
      const merged = upsertTokenEntry(
        nextFcmTokens,
        deviceEntry
      );
      nextFcmTokens = Array.from(
        new Map(merged.map((e) => [e.token, e])).values()
      );
      baseData.fcmTokens = nextFcmTokens;
      baseData.fcmToken = deviceEntry.token; // 레거시 호환
    }

    await updateDoc(ref, baseData);

    console.log("기존 사용자 토큰/위치 업데이트");
  }
};
