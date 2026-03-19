<template>
  <main class="page">
    <div class="page-content">
      <!-- 상단 영역 -->
      <div class="header-section">
        <button type="button" class="gps-refresh-btn" @click="refreshLocation" aria-label="현재 위치 업데이트">
          <span class="gps-refresh-icon" aria-hidden="true"></span>
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
      />
      <div v-else class="current-loading-card">
        <div class="spinner"></div>
        <p class="loading-text">날씨 정보를 불러오는 중...</p>
      </div>

      <div class="push-toggle-wrap">
        <div class="push-toggle-row">
          <div class="push-label-wrap">
            <span class="push-toggle-label">강수 알림</span>
            <InfoTooltip text="3시간뒤 비 예보 알림" label="강수 알림 안내" />
          </div>
          <button
            type="button"
            class="push-toggle-btn"
            :class="{ on: isPushEnabled }"
            :disabled="pushToggleLoading || !isLoggedIn"
            @click="togglePushSetting"
          >
            <span class="toggle-thumb"></span>
          </button>
        </div>
      </div>

      <HourlyWeatherSection :lat="position.lat" :lng="position.lng" />

      <!-- 주간 날씨 -->
      <WeeklyWeather :lat="position.lat" :lng="position.lng" :location-error="locationError" />

      <!-- 알림설정 버튼 -->
      <button type="button" class="alarm-setting-btn" @click="startAlarm">
        <span class="alarm-icon">🔔</span>
        <span class="alarm-label">알림설정</span>
      </button>

      <ToastMessage :message="toastMessage" :visible="toastVisible" />
    </div>
  </main>
</template>

<script setup lang="ts">
import CurrentWeather from "./weather/components/CurrentWeather.vue";
import WeeklyWeather from "./weather/components/WeeklyWeather.vue";
import ToastMessage from "../components/ToastMessage.vue";
import InfoTooltip from "../components/InfoTooltip.vue";
import HourlyWeatherSection from "../components/HourlyWeatherSection.vue";

import { ref, onMounted } from "vue";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { useGoogleLogin } from "../composables/useGoogleLogin";
import { saveUser } from "../composables/useUser";
import { usePush } from "../composables/usePush";
import { useLocation } from "../composables/useLocation";

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
const isLoggedIn = ref(false);

const handlePositionUpdate = (lat: number, lng: number) => {
  position.value = { lat, lng };
};

const handleLocationError = (error: string) => {
  locationError.value = error;
};

// @ts-ignore - Nuxt auto-import
const router = useRouter();
// @ts-ignore - Nuxt auto-import
const { $auth, $db } = useNuxtApp();

const { getCurrentLocation } = useLocation();

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
      isPushEnabled.value = false;
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
      if (typeof data.lat === "number" && typeof data.lng === "number") {
        position.value = { lat: data.lat, lng: data.lng };
        hasSavedLocation.value = true;
      }
      isPushEnabled.value = data.isPush === true;
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
      isPushEnabled.value = false;
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
