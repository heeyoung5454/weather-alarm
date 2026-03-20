import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

type Coords = { lat: number; lng: number };

type DeviceMeta = {
  userAgent?: string;
  appVersion?: string;
  platform?: string;
  screen?: string; // 예: 390x844
};

type FcmTokenEntry = {
  token: string;
  meta?: DeviceMeta;
  enabled?: boolean;
};

const getDeviceMeta = (): DeviceMeta => {
  // ssr/특수 환경에서 window/navigator가 없을 수 있으므로,
  // 통째로 `{}` 반환하지 말고 필드별 안전 접근으로 최대한 채웁니다.
  const win = typeof window !== "undefined" ? window : undefined;
  const nav = win?.navigator;

  const uaRaw = nav?.userAgent || "";
  const userAgent = uaRaw.length > 140 ? uaRaw.slice(0, 140) + "..." : uaRaw;

  const appVersion = nav?.appVersion || "";

  // userAgentData는 브라우저에 따라 없을 수 있습니다.
  // @ts-ignore
  const uaData = nav?.userAgentData as
    | {
        platform?: string;
        mobile?: boolean;
        brands?: Array<{ brand?: string; version?: string }>;
      }
    | undefined;

  const platform = uaData?.platform ?? nav?.platform ?? "";

  const innerWidth = typeof win?.innerWidth === "number" ? win!.innerWidth : undefined;
  const innerHeight = typeof win?.innerHeight === "number" ? win!.innerHeight : undefined;

  // 기존 UI 호환용: 화면크기를 "widthxheight" 형태로 저장
  // 우선 innerWidth/innerHeight를 쓰고, 없으면 screen.width/screen.height 사용
  const screenSize =
    typeof innerWidth === "number" && typeof innerHeight === "number"
      ? `${innerWidth}x${innerHeight}`
      : win?.screen && typeof win.screen.width === "number" && typeof win.screen.height === "number"
        ? `${win.screen.width}x${win.screen.height}`
        : "";

  return {
    userAgent: userAgent || undefined,
    appVersion: appVersion || undefined,
    platform: platform || undefined,
    screen: screenSize || undefined,
  };
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
    // 필요값만 저장: next.meta만 사용
    meta: next.meta ?? {},
    // 기존 enabled 상태를 우선 유지 (사용자가 끈 경우에도 계속 유지)
    enabled: typeof existing[idx]?.enabled === "boolean" ? existing[idx].enabled : (next.enabled ?? true),
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
    const legacyToken = typeof current?.fcmToken === "string" && current.fcmToken.trim().length > 0 ? current.fcmToken.trim() : "";

    let nextFcmTokens: FcmTokenEntry[] = [];

    if (Array.isArray(current?.fcmTokens)) {
      nextFcmTokens = normalizeFcmTokens(current.fcmTokens);
    } else if (legacyToken) {
      nextFcmTokens = [{ token: legacyToken, meta: {}, enabled: true }];
    }

    if (deviceEntry) {
      // 기존에 들어있던 레거시 fcmToken도 token 중복 제거로 함께 반영
      const merged = upsertTokenEntry(nextFcmTokens, deviceEntry);
      nextFcmTokens = Array.from(new Map(merged.map((e) => [e.token, e])).values());
      baseData.fcmTokens = nextFcmTokens;
      baseData.fcmToken = deviceEntry.token; // 레거시 호환
    }

    await updateDoc(ref, baseData);

    console.log("기존 사용자 토큰/위치 업데이트");
  }
};
