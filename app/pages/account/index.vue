<template>
  <main class="page">
    <div class="account-header">
      <button type="button" class="home-nav-btn" @click="router.push('/')">
        <svg class="home-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6a2 2 0 0 0-2-2H11a2 2 0 0 0-2 2v6H4a1 1 0 0 1-1-1V10.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
    <div class="card">
      <h1 class="title">계정</h1>

      <div v-if="isLoggedIn === true" class="content">
        <p class="row">
          <span class="label">이메일</span>
          <span class="value">{{ userEmail }}</span>
        </p>
        <p class="row">
          <span class="label">이름</span>
          <span class="value">{{ userName }}</span>
        </p>

        <div class="tokens-section">
          <p class="section-title">등록 디바이스 (FCM 토큰)</p>
          <p class="hint" v-if="fcmTokenEntries.length === 0">등록된 토큰이 없습니다.</p>

          <div v-else class="tokens-list">
            <div v-for="(t, idx) in fcmTokenEntries" :key="t.token + '_' + idx" class="token-item">
              <span v-if="t.token === currentToken" class="token-badge">현재 디바이스</span>
              <button
                type="button"
                class="device-toggle-btn"
                :class="{ on: t.enabled !== false }"
                :disabled="logoutLoading"
                @click="toggleDevicePush(t.token, !(t.enabled !== false))"
              >
                {{ t.enabled !== false ? "알림 ON" : "알림 OFF" }}
              </button>
              <span class="token-index">{{ idx + 1 }}</span>
              <div class="token-main">
                <code class="token-text">{{ maskToken(t.token) }}</code>
                <div class="token-meta">
                  <p class="meta-line"><span class="meta-key">UA</span><span class="meta-val">{{ t.meta?.ua || "-" }}</span></p>
                  <p class="meta-line"><span class="meta-key">플랫폼</span><span class="meta-val">{{ t.meta?.platform || "-" }}</span></p>
                  <p class="meta-line"><span class="meta-key">언어</span><span class="meta-val">{{ t.meta?.lang || "-" }}</span></p>
                  <p class="meta-line"><span class="meta-key">타임존</span><span class="meta-val">{{ t.meta?.tz || "-" }}</span></p>
                  <p class="meta-line"><span class="meta-key">화면</span><span class="meta-val">{{ t.meta?.screen || "-" }}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button type="button" class="logout-btn" :disabled="logoutLoading" @click="handleLogout">
          로그아웃
        </button>
      </div>

      <div v-else-if="isLoggedIn === false" class="content">
        <p class="hint">로그인이 필요합니다.</p>
        <button type="button" class="back-btn" :disabled="logoutLoading" @click="router.push('/')">
          홈으로
        </button>
      </div>

      <div v-else class="content">
        <p class="hint">계정 정보를 불러오는 중...</p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

// @ts-ignore - Nuxt auto-import
const router = useRouter();

const { $auth, $db } = useNuxtApp();

const isLoggedIn = ref<boolean | null>(null);
const userEmail = ref("");
const userName = ref("");
const logoutLoading = ref(false);
type DeviceMeta = {
  ua?: string;
  platform?: string;
  lang?: string;
  tz?: string;
  screen?: string;
  dpr?: number;
};

type FcmTokenEntry = {
  token: string;
  meta?: DeviceMeta;
  enabled?: boolean;
};

const fcmTokenEntries = ref<FcmTokenEntry[]>([]);
const currentToken = ref("");

const maskToken = (token: string) => {
  const t = token.trim();
  if (t.length <= 10) return t;
  return `${t.slice(0, 10)}...${t.slice(-6)}`;
};

const normalizeFcmTokenEntries = (raw: any): FcmTokenEntry[] => {
  if (!Array.isArray(raw)) return [];

  const out: FcmTokenEntry[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const token = item.trim();
      if (token) out.push({ token, meta: {}, enabled: true });
      continue;
    }
    if (item && typeof item === "object" && typeof item.token === "string") {
      const token = item.token.trim();
      if (token)
        out.push({
          token,
          meta: item.meta ?? {},
          enabled: typeof item.enabled === "boolean" ? item.enabled : true,
        });
    }
  }
  return out;
};

const toggleDevicePush = async (token: string, enabled: boolean) => {
  const currentUser = $auth.currentUser;
  const uid = currentUser?.uid;
  if (!uid) return;

  try {
    logoutLoading.value = true;
    const refDoc = doc($db, "users", uid);
    const snap = await getDoc(refDoc);
    if (!snap.exists()) return;

    const data: any = snap.data() || {};
    const entriesFromArray = normalizeFcmTokenEntries(data?.fcmTokens);
    const legacyToken =
      typeof data?.fcmToken === "string" && data.fcmToken.trim().length > 0 ? data.fcmToken.trim() : "";

    const merged = Array.from(
      new Map(
        [
          ...(entriesFromArray ?? []),
          ...(legacyToken ? [{ token: legacyToken, meta: {}, enabled: true }] : []),
        ].map((e) => [e.token, e] as const)
      ).values()
    );

    const next = merged.map((e) =>
      e.token === token
        ? {
            ...e,
            enabled,
          }
        : e
    );

    const updatePayload: any = {
      fcmTokens: next.map((e) => ({
        token: e.token,
        meta: e.meta ?? {},
        enabled: e.enabled !== false,
      })),
      fcmToken: next[0]?.token ?? "",
    };

    await updateDoc(refDoc, updatePayload);
    fcmTokenEntries.value = next;
  } finally {
    logoutLoading.value = false;
  }
};

const handleLogout = async () => {
  const currentUser = $auth.currentUser;
  const uid = currentUser?.uid;
  const currentToken = localStorage.getItem("fcmToken") || "";

  try {
    logoutLoading.value = true;

    // 로그아웃해도 users 문서에 남아 있으면 다른 디바이스에서도 계속 푸시가 갈 수 있어
    // 현재 디바이스 토큰만 제거합니다.
    if (uid && currentToken) {
      try {
        const refDoc = doc($db, "users", uid);
        const snap = await getDoc(refDoc);
        if (snap.exists()) {
          const data: any = snap.data() || {};
          const entriesFromArray = normalizeFcmTokenEntries(data.fcmTokens);
          const legacyToken =
            typeof data.fcmToken === "string" && data.fcmToken.trim().length > 0 ? data.fcmToken.trim() : "";

          const merged = Array.from(
            new Map(
              [
                ...(entriesFromArray ?? []),
                ...(legacyToken ? [{ token: legacyToken, meta: {}, enabled: true }] : []),
              ].map((e) => [e.token, e] as const)
            ).values()
          );

          const next = merged.filter((e) => e.token !== currentToken);

          const updatePayload: any = {
            fcmTokens: next.map((e) => ({
              token: e.token,
              meta: e.meta ?? {},
              enabled: e.enabled !== false,
            })),
          };
          updatePayload.fcmToken = next[0]?.token ?? "";

          await updateDoc(refDoc, updatePayload);
        }
      } catch {
        // users 문서가 없거나 필드가 아직 없을 수 있음
      }
      localStorage.removeItem("fcmToken");
    }

    await signOut($auth);
    router.push("/");
  } finally {
    logoutLoading.value = false;
  }
};

onMounted(() => {
  onAuthStateChanged($auth, async (user) => {
    if (!user) {
      isLoggedIn.value = false;
      userEmail.value = "";
      userName.value = "";
      fcmTokenEntries.value = [];
      currentToken.value = "";
      return;
    }

    isLoggedIn.value = true;
    userEmail.value = user.email ?? "";
    currentToken.value = localStorage.getItem("fcmToken") || "";

    // Firestore `users` 문서의 name을 우선 사용
    try {
      const refDoc = doc($db, "users", user.uid);
      const snap = await getDoc(refDoc);
      if (snap.exists()) {
        const data: any = snap.data();
        userName.value = data?.name ?? user.displayName ?? "";

        const entriesFromArray = normalizeFcmTokenEntries(data?.fcmTokens);
        const legacyToken =
          typeof data?.fcmToken === "string" && data.fcmToken.trim().length > 0 ? data.fcmToken.trim() : "";

        const merged = Array.from(
          new Map(
            [
              ...(entriesFromArray ?? []),
              ...(legacyToken ? [{ token: legacyToken, meta: {}, enabled: true }] : []),
            ].map((e) => [e.token, e] as const)
          ).values()
        );
        fcmTokenEntries.value = merged;
      } else {
        userName.value = user.displayName ?? "";
        fcmTokenEntries.value = [];
      }
    } catch {
      userName.value = user.displayName ?? "";
      fcmTokenEntries.value = [];
    }
  });
});
</script>

<style scoped>
.page {
  min-height: calc(100vh - 156px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #8ed0ff 0%, #d9f0ff 50%, #f6fbff 100%);
  padding: 24px;
  box-sizing: border-box;
  position: relative;
}

.account-header {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 1000;
}

.home-nav-btn {
  padding: 10px 12px;
  border-radius: 999px;
  border: none;
  background: #edf2f6;
  color: #4b5b6a;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.home-nav-btn:hover {
  transform: translateY(-1px);
}

.home-icon {
  width: 18px;
  height: 18px;
}

.card {
  width: 100%;
  max-width: 480px;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  border-radius: 24px;
  box-shadow: 0 12px 30px rgba(29, 76, 122, 0.2);
  padding: 22px 18px;
}

.title {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 900;
  color: #17446d;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row {
  margin: 0;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 16px;
  background: #ffffffcc;
  border: 1px solid #d8e7f3;
}

.label {
  font-size: 13px;
  font-weight: 800;
  color: #17446d;
}

.value {
  font-size: 13px;
  font-weight: 700;
  color: #4b5b6a;
  text-align: right;
  word-break: break-word;
}

.hint {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #4c6f8f;
}

.logout-btn {
  margin-top: 6px;
  padding: 12px 14px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #2c83c9 0%, #17446d 100%);
  color: white;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 14px rgba(44, 131, 201, 0.4);
}

.logout-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(44, 131, 201, 0.5);
}

.logout-btn:active:not(:disabled) {
  transform: translateY(0);
}

.logout-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tokens-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 8px 0 4px;
}

.section-title {
  margin: 0;
  font-size: 13px;
  font-weight: 900;
  color: #17446d;
}

.tokens-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.token-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 16px;
  background: #ffffffcc;
  border: 1px solid #d8e7f3;
}

.device-toggle-btn {
  flex: 0 0 auto;
  padding: 7px 10px;
  border-radius: 999px;
  border: none;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.2s;
  background: #edf2f6;
  color: #4b5b6a;
}

.device-toggle-btn.on {
  background: #d9f0ff;
  color: #17446d;
}

.device-toggle-btn:not(.on) {
  background: #ffe9e9;
  color: #b91c1c;
}

.token-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.token-badge {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 900;
  color: #17446d;
  background: #d9f0ff;
  padding: 4px 8px;
  border-radius: 999px;
}

.token-index {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 800;
  color: #4b5b6a;
  padding-top: 2px;
}

.token-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 11px;
  font-weight: 700;
  color: #2f3f55;
  word-break: break-all;
  white-space: normal;
  line-height: 1.4;
}

.token-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-line {
  margin: 0;
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.meta-key {
  flex: 0 0 auto;
  width: 56px;
  font-size: 12px;
  font-weight: 900;
  color: #17446d;
}

.meta-val {
  flex: 1 1 auto;
  font-size: 12px;
  font-weight: 700;
  color: #4b5b6a;
  word-break: break-word;
}

.back-btn {
  padding: 12px 14px;
  border-radius: 999px;
  border: none;
  background: #edf2f6;
  color: #4b5b6a;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
}

.back-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
