<template>
  <main class="page">
    <div class="page-content">
      <!-- 전국날씨 링크 -->
      <div class="header-section">
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

      <!-- 주간 날씨 -->
      <WeeklyWeather :lat="position.lat" :lng="position.lng" :location-error="locationError" />

      <!-- 알림설정 버튼 -->
      <button type="button" class="alarm-setting-btn" @click="startAlarm">
        <span class="alarm-icon">🔔</span>
        <span class="alarm-label">알림설정</span>
      </button>
    </div>
  </main>
</template>

<script setup lang="ts">
import CurrentWeather from "./weather/components/CurrentWeather.vue";
import WeeklyWeather from "./weather/components/WeeklyWeather.vue";

import { ref, onMounted } from "vue";
import { doc, getDoc } from "firebase/firestore";
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

onMounted(() => {
  onAuthStateChanged($auth, async (user) => {
    if (!user) {
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

    const ref = doc($db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data: any = snap.data();
      if (typeof data.lat === "number" && typeof data.lng === "number") {
        position.value = { lat: data.lat, lng: data.lng };
        hasSavedLocation.value = true;
      }
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
  min-height: 100vh;
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
  justify-content: flex-end;
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

.alarm-setting-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 24px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #2c83c9 0%, #17446d 100%);
  color: white;
  font-size: 16px;
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
    padding: 14px 20px;
    font-size: 15px;
  }

  .alarm-icon {
    font-size: 18px;
  }
}
</style>
