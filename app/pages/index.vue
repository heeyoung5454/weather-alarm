<template>
  <main class="page">
    <div class="page-content">
      <!-- 상단 영역 -->
      <div class="header-section">
        <button v-if="isLoggedIn === true" type="button" class="header-logout-btn" @click="goToAccount" aria-label="My">
          <span class="alarm-icon">👤</span>
          <span class="alarm-label">My</span>
        </button>
        <button v-else-if="isLoggedIn === false" type="button" class="header-login-btn" :disabled="loginLoading || isConsentModalOpen" @click="openConsentModal">
          <span class="alarm-icon">🔑</span>
          <span class="alarm-label">구글 로그인</span>
        </button>

        <NuxtLink to="/weather/nationalWeather" class="national-weather-link">
          <span class="link-text">전국날씨</span>
          <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </NuxtLink>
      </div>

      <!-- 현재 날씨 -->
      <CurrentWeather
        v-if="currentReady"
        :initial-lat="position.lat"
        :initial-lng="position.lng"
        :use-saved-location="hasSavedLocation"
        @update:position="handlePositionUpdate"
        @update:location-error="handleLocationError"
        @refresh-location="refreshLocation"
      />
      <div v-else class="current-loading-card">
        <div class="spinner"></div>
        <p class="loading-text">날씨 정보를 불러오는 중...</p>
      </div>

      <div v-if="hasAirKoreaKey" class="air-quality-card">
        <p class="air-quality-head">{{ airSummary?.sido ?? "—" }}</p>
        <div v-if="airLoading" class="air-quality-loading">불러오는 중…</div>
        <template v-else-if="airSummary && !airError">
          <p v-if="airSummary.pm10 == null && airSummary.pm25 == null" class="air-empty-hint">측정값이 없거나 아직 갱신되지 않았습니다.</p>
          <div class="air-quality-metrics">
            <div class="air-metric">
              <span class="air-label">미세먼지</span>
              <strong class="air-value">{{ airSummary.pm10 != null ? `${airSummary.pm10}` : "—" }}</strong>
              <span class="air-unit">㎍/㎥</span>
              <span v-if="airSummary.gradePm10" class="air-grade" :class="gradeClass(airSummary.pm10, 'pm10')">{{ airSummary.gradePm10 }}</span>
            </div>
            <div class="air-metric">
              <span class="air-label">초미세먼지</span>
              <strong class="air-value">{{ airSummary.pm25 != null ? `${airSummary.pm25}` : "—" }}</strong>
              <span class="air-unit">㎍/㎥</span>
              <span v-if="airSummary.gradePm25" class="air-grade" :class="gradeClass(airSummary.pm25, 'pm25')">{{ airSummary.gradePm25 }}</span>
            </div>
          </div>
        </template>
        <p v-else-if="airError" class="air-error">{{ airError }}</p>
      </div>

      <div class="push-toggle-wrap">
        <div class="push-toggle-row">
          <div class="push-label-wrap">
            <span class="push-toggle-label">강수 알림</span>
            <InfoTooltip text="3시간뒤 비 예보 알림" label="강수 알림 안내" />
          </div>
          <button type="button" class="push-toggle-btn" :class="{ on: isPushEnabled }" :disabled="pushToggleLoading || isLoggedIn !== true" @click="togglePushSetting">
            <span class="toggle-thumb"></span>
          </button>
        </div>
      </div>

      <HourlyWeatherSection :lat="position.lat" :lng="position.lng" />

      <!-- 주간 날씨 -->
      <WeeklyWeather :lat="position.lat" :lng="position.lng" :location-error="locationError" />

      <!-- 알림설정 버튼 -->
      <button type="button" class="alarm-setting-btn" @click="startAlarm" v-if="isLoggedIn === true">
        <span class="alarm-icon">🔔</span>
        <span class="alarm-label">알림설정</span>
      </button>

      <ToastMessage :message="toastMessage" :visible="toastVisible" />

      <ConfirmDialog :visible="isConsentModalOpen" title="동의 안내" :message="consentMessage" confirm-text="동의" cancel-text="취소" @confirm="confirmConsentAndLogin" @cancel="closeConsentModal" />
    </div>
  </main>
</template>

<script setup lang="ts">
import CurrentWeather from "./weather/components/CurrentWeather.vue";
import WeeklyWeather from "./weather/components/WeeklyWeather.vue";
import ToastMessage from "../components/ToastMessage.vue";
import InfoTooltip from "../components/InfoTooltip.vue";
import HourlyWeatherSection from "../components/HourlyWeatherSection.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";

import { ref, onMounted, watch, computed } from "vue";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { useGoogleLogin } from "../composables/useGoogleLogin";
import { saveUser } from "../composables/useUser";
import { usePush } from "../composables/usePush";
import { useLocation } from "../composables/useLocation";
import { fetchAirQualityByCoords, type AirQualitySummary } from "../composables/useAirQuality";

const position = ref({
  lat: 0,
  lng: 0,
});

const locationError = ref("");
const hasSavedLocation = ref(false);
const currentReady = ref(false);
const toastVisible = ref(false);
const toastMessage = ref("");
const isPushEnabled = ref(false);
const pushToggleLoading = ref(false);
const isLoggedIn = ref<boolean | null>(null);
const syncedFcmUid = ref<string | null>(null);
const loginLoading = ref(false);
const userName = ref("");
const isConsentModalOpen = ref(false);

const consentMessage = `알림 서비스를 이용하기 위해 로그인이 필요합니다.

로그인 시 아래 정보를 수집합니다:
- 이메일 주소
- 이름

수집된 정보는 알림 제공 및 서비스 운영에만 사용됩니다.`;

const handleLocationError = (error: string) => {
  locationError.value = error;
};

// @ts-ignore - Nuxt auto-import
const router = useRouter();
// @ts-ignore - Nuxt auto-import
const route = useRoute();
// @ts-ignore - Nuxt auto-import
const { $auth, $db } = useNuxtApp();

const handlePositionUpdate = async (lat: number, lng: number) => {
  position.value = { lat, lng };
  const user = $auth.currentUser;
  if (!user) return;
  if (typeof lat !== "number" || typeof lng !== "number") return;
  if (lat === 0 && lng === 0) return;
  try {
    const token = localStorage.getItem("fcmToken") || "";
    await saveUser(user, token, { lat, lng });
  } catch (e) {
    console.error("위치·userRegions 저장 실패:", e);
  }
};

const { getCurrentLocation } = useLocation();

// @ts-ignore - Nuxt auto-import
const config = useRuntimeConfig();
const hasAirKoreaKey = computed(() => !!String(config.public.airKoreaKey || "").trim());

const airLoading = ref(false);
const airError = ref("");
const airSummary = ref<AirQualitySummary | null>(null);

const gradeClass = (v: number | null, kind: "pm10" | "pm25") => {
  if (v == null) return "";
  const good = kind === "pm10" ? v <= 30 : v <= 15;
  const mid = kind === "pm10" ? v <= 80 : v <= 35;
  const bad = kind === "pm10" ? v <= 150 : v <= 75;
  if (good) return "g-good";
  if (mid) return "g-mid";
  if (bad) return "g-bad";
  return "g-verybad";
};

const loadAirQuality = async () => {
  if (!hasAirKoreaKey.value) return;
  const { lat, lng } = position.value;
  if (typeof lat !== "number" || typeof lng !== "number" || (lat === 0 && lng === 0)) return;
  airLoading.value = true;
  airError.value = "";
  try {
    const r = await fetchAirQualityByCoords(lat, lng);
    airSummary.value = r;
    if (!r) airError.value = "대기질 정보를 불러오지 못했습니다.";
  } catch {
    airSummary.value = null;
    airError.value = "대기질 정보를 불러오지 못했습니다.";
  } finally {
    airLoading.value = false;
  }
};

watch(
  position,
  () => {
    loadAirQuality();
  },
  { deep: true }
);

const WITHDRAW_TOAST_MSG = "탈퇴되었습니다. 서비스를 이용해주셔서 감사합니다";

const showWithdrawSuccessToastIfNeeded = () => {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem("showWithdrawSuccessToast") !== "1") return;
  sessionStorage.removeItem("showWithdrawSuccessToast");
  toastMessage.value = WITHDRAW_TOAST_MSG;
  toastVisible.value = true;
  setTimeout(() => {
    toastVisible.value = false;
  }, 4000);
};

watch(
  () => route.fullPath,
  () => {
    showWithdrawSuccessToastIfNeeded();
  },
  { immediate: true }
);

const syncFcmTokenOnLogin = async (user: any) => {
  const uid = user?.uid;
  if (!uid) return;
  if (syncedFcmUid.value === uid) return;
  syncedFcmUid.value = uid;

  // 이미 디바이스에 저장된 토큰이 있으면, 권한 프롬프트 없이 우선 users에 반영
  let token = localStorage.getItem("fcmToken") || "";

  // localStorage에 없으면 로그인 시점에 토큰 발급/동기화 시도
  if (!token) {
    token = (await usePush()) ?? "";
  }

  token = typeof token === "string" ? token.trim() : "";
  if (!token) return;

  localStorage.setItem("fcmToken", token);

  // users 문서에 이미 저장된 위치가 있으면 함께 저장
  const canUseCoords = typeof position.value?.lat === "number" && typeof position.value?.lng === "number" && position.value.lat !== 0 && position.value.lng !== 0;

  if (canUseCoords) {
    await saveUser(user, token, { lat: position.value.lat, lng: position.value.lng });
  } else {
    await saveUser(user, token);
  }
};

const togglePushSetting = async () => {
  const user = $auth.currentUser;
  if (!user) {
    toastMessage.value = "로그인 후 사용 가능합니다.";
    toastVisible.value = true;
    setTimeout(() => {
      toastVisible.value = false;
    }, 2000);
    return;
  }

  try {
    pushToggleLoading.value = true;
    const nextValue = !isPushEnabled.value;
    const userRef = doc($db, "users", user.uid);
    await setDoc(userRef, { isPush: nextValue }, { merge: true });
    isPushEnabled.value = nextValue;
  } catch {
    toastMessage.value = "푸시 설정 변경에 실패했습니다.";
    toastVisible.value = true;
    setTimeout(() => {
      toastVisible.value = false;
    }, 2000);
  } finally {
    pushToggleLoading.value = false;
  }
};

const handleGoogleLogin = async () => {
  try {
    loginLoading.value = true;
    await useGoogleLogin();
  } finally {
    loginLoading.value = false;
  }
};

const goToAccount = () => {
  router.push("/account");
};

const openConsentModal = () => {
  isConsentModalOpen.value = true;
};

const closeConsentModal = () => {
  isConsentModalOpen.value = false;
};

const confirmConsentAndLogin = async () => {
  closeConsentModal();
  await handleGoogleLogin();
};

const refreshLocation = async () => {
  try {
    const coords = await getCurrentLocation();
    position.value = { lat: coords.lat, lng: coords.lng };
    locationError.value = "";
    hasSavedLocation.value = false;

    // 로그인 상태라면 users 컬렉션의 lat/lng도 함께 업데이트
    const user = $auth.currentUser;
    if (user) {
      const token = localStorage.getItem("fcmToken") || "";
      if (token) {
        await saveUser(user, token, { lat: coords.lat, lng: coords.lng });
      }
    }
  } catch {
    toastMessage.value = "위치 정보를 허용해주세요.";
    toastVisible.value = true;
    setTimeout(() => {
      toastVisible.value = false;
    }, 2000);
  }
};

onMounted(() => {
  onAuthStateChanged($auth, async (user) => {
    if (!user) {
      isLoggedIn.value = false;
      userName.value = "";
      isPushEnabled.value = false;
      syncedFcmUid.value = null;
      // 비로그인: 여기서 한 번만 현재 위치를 가져온다.
      try {
        const coords = await getCurrentLocation();
        position.value = { lat: coords.lat, lng: coords.lng };
      } catch {
        locationError.value = "위치 권한이 거부되었거나 위치를 가져올 수 없습니다.";
      } finally {
        currentReady.value = true;
      }
      return;
    }

    isLoggedIn.value = true;

    const ref = doc($db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data: any = snap.data();
      userName.value = data?.name ?? user.displayName ?? "";
      if (typeof data.lat === "number" && typeof data.lng === "number") {
        position.value = { lat: data.lat, lng: data.lng };
        hasSavedLocation.value = true;
      }
      isPushEnabled.value = data.isPush === true;

      // 로그인 직후: 현재 디바이스 토큰을 users/{uid}.fcmTokens에 동기화
      await syncFcmTokenOnLogin(user);
    } else {
      await setDoc(
        ref,
        {
          email: user.email ?? "",
          name: user.displayName ?? "",
          isPush: false,
          createdAt: new Date(),
        },
        { merge: true }
      );
      userName.value = user.displayName ?? "";
      isPushEnabled.value = false;

      // 사용자 문서가 새로 생성된 직후에도 토큰을 바로 반영
      await syncFcmTokenOnLogin(user);
    }

    currentReady.value = true;
  });
});

const startAlarm = async () => {
  let user = $auth.currentUser;
  if (!user) {
    user = await useGoogleLogin();
  }

  const token = await usePush();
  if (!user || !token) return;

  try {
    const coords = await getCurrentLocation();
    await saveUser(user, token, { lat: coords.lat, lng: coords.lng });
    localStorage.setItem("fcmToken", token);
  } catch {
    await saveUser(user, token);
    localStorage.setItem("fcmToken", token);
  }

  router.push("/alarm");
};
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

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gps-refresh-btn {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: none;
  background: #ffffffee;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(29, 76, 122, 0.15);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.gps-refresh-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(29, 76, 122, 0.2);
}

.gps-refresh-btn:active {
  transform: translateY(0);
}

.gps-refresh-icon {
  position: relative;
  width: 18px;
  height: 18px;
  border: 2px solid #2c83c9;
  border-radius: 50%;
  box-sizing: border-box;
}

.gps-refresh-icon::before,
.gps-refresh-icon::after {
  content: "";
  position: absolute;
  background: #2c83c9;
}

.gps-refresh-icon::before {
  width: 2px;
  height: 24px;
  top: -5px;
  left: 6px;
}

.gps-refresh-icon::after {
  width: 24px;
  height: 2px;
  top: 6px;
  left: -5px;
}

.national-weather-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #ffffffee;
  backdrop-filter: blur(8px);
  border-radius: 20px;
  text-decoration: none;
  color: #2c83c9;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(29, 76, 122, 0.15);
  transition: all 0.3s;
}

.national-weather-link:hover {
  background: #2c83c9;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(29, 76, 122, 0.25);
}

.link-text {
  white-space: nowrap;
}

.arrow-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.3s;
}

.national-weather-link:hover .arrow-icon {
  transform: translateX(3px);
}

.page-content {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.login-top {
  width: 100%;
  display: flex;
  justify-content: center;
}

.user-name-text {
  margin: 0;
  width: 100%;
  text-align: center;
  padding: 10px 16px;
  border-radius: 18px;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  box-shadow: 0 4px 12px rgba(29, 76, 122, 0.12);
  color: #17446d;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.google-login-btn {
  width: 100%;
  padding: 12px 16px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #2c83c9 0%, #17446d 100%);
  color: white;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 4px 14px rgba(44, 131, 201, 0.35);
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    opacity 0.2s;
}

.google-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(44, 131, 201, 0.45);
}

.current-loading-card {
  width: 100%;
  min-height: 332px;
  border-radius: 24px;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  box-shadow: 0 12px 30px #1d4c7a29;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-sizing: border-box;
}

.spinner {
  width: 42px;
  height: 42px;
  border: 4px solid #d9f0ff;
  border-top-color: #2c83c9;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #4c6f8f;
}

.air-quality-card {
  width: 100%;
  padding: 16px 18px;
  border-radius: 20px;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  box-shadow: 0 8px 22px rgba(29, 76, 122, 0.12);
  box-sizing: border-box;
}

.air-quality-head {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 800;
  color: #17446d;
}

.air-quality-loading {
  margin: 0;
  font-size: 13px;
  color: #6b8399;
}

.air-quality-metrics {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.air-metric {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 10px;
}

.air-label {
  font-size: 13px;
  font-weight: 700;
  color: #6b8399;
  min-width: 110px;
}

.air-value {
  font-size: 28px;
  font-weight: 800;
  color: #17446d;
  letter-spacing: -0.02em;
}

.air-unit {
  font-size: 12px;
  font-weight: 600;
  color: #8aa3b8;
}

.air-grade {
  margin-left: auto;
  font-size: 12px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
}

.air-grade.g-good {
  background: #d9f0ff;
  color: #17446d;
}

.air-grade.g-mid {
  background: #fff3d4;
  color: #7a5a00;
}

.air-grade.g-bad {
  background: #ffe4d4;
  color: #a14a00;
}

.air-grade.g-verybad {
  background: #ffd9e0;
  color: #9aa3b8;
}

.air-error {
  margin: 0;
  font-size: 13px;
  color: #c45c5c;
}

.air-empty-hint {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.45;
  color: #6b8399;
}

.push-toggle-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: -6px;
  margin-bottom: -10px;
}

.push-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 14px;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  box-shadow: 0 4px 12px rgba(29, 76, 122, 0.12);
}

.push-label-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.push-toggle-label {
  font-size: 13px;
  font-weight: 700;
  color: #17446d;
}

.push-toggle-btn {
  width: 52px;
  height: 30px;
  border-radius: 999px;
  border: none;
  background: #c8d7e3;
  padding: 3px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.push-toggle-btn.on {
  background: #2c83c9;
}

.push-toggle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-thumb {
  display: block;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  transform: translateX(0);
  transition: transform 0.2s ease;
}

.push-toggle-btn.on .toggle-thumb {
  transform: translateX(22px);
}

.alarm-setting-btn {
  position: fixed;
  left: 18px;
  bottom: 18px;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: auto;
  padding: 12px 14px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #2c83c9 0%, #17446d 100%);
  color: white;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(44, 131, 201, 0.4);
  cursor: pointer;
  transition: all 0.3s;
}

.alarm-setting-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(44, 131, 201, 0.5);
}

.alarm-setting-btn:active {
  transform: translateY(0);
}

.header-login-btn {
  width: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 14px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #2c83c9 0%, #17446d 100%);
  color: white;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(44, 131, 201, 0.4);
  cursor: pointer;
  transition: all 0.3s;
}

.header-login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(44, 131, 201, 0.5);
}

.header-login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.header-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.header-logout-btn {
  width: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 14px;
  border: none;
  border-radius: 999px;
  background: #ffebeb;
  color: #b91c1c;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(255, 0, 0, 0.12);
  cursor: pointer;
  transition: all 0.3s;
}

.header-logout-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 0, 0, 0.18);
}

.header-logout-btn:active:not(:disabled) {
  transform: translateY(0);
}

.header-logout-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alarm-icon {
  font-size: 20px;
}

.alarm-label {
  letter-spacing: -0.02em;
}

@media (max-width: 768px) {
  .national-weather-link {
    padding: 8px 12px;
    font-size: 13px;
  }

  .arrow-icon {
    width: 14px;
    height: 14px;
  }

  .alarm-setting-btn {
    left: 12px;
    bottom: 12px;
    padding: 10px 12px;
    font-size: 13px;
  }

  .alarm-icon {
    font-size: 18px;
  }
}
</style>
