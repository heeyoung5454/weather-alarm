<template>
  <main class="page">
    <section class="weather-card">
      <p class="label">현재 지역 위치</p>
      <div class="location-row">
        <span class="gps-icon" aria-hidden="true"></span>
        <p class="location-text">{{ locationText }}</p>
      </div>
      <p v-if="locationError" class="location-error">{{ locationError }}</p>

      <div class="weather-icon" :class="`icon-${weatherData.icon}`" aria-hidden="true">
        <template v-if="weatherData.icon === 'sunny'">
          <span class="sun-core"></span>
        </template>

        <template v-else-if="weatherData.icon === 'cloudy'">
          <span class="cloud cloud-main"></span>
          <span class="cloud cloud-sub"></span>
        </template>

        <template v-else-if="weatherData.icon === 'rainy'">
          <span class="cloud cloud-main"></span>
          <span class="drop drop-1"></span>
          <span class="drop drop-2"></span>
          <span class="drop drop-3"></span>
        </template>
      </div>

      <p class="weather-text">{{ weatherData.condition }}</p>
      <p class="temperature">{{ weatherData.temperature }}°C</p>

      <button class="change-button" type="button" @click="cycleWeather">디자인 상태 변경</button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useLocation } from "../composables/useLocation";
import { getRegionName } from "../utils/reverseGeo";

type WeatherIcon = "sunny" | "cloudy" | "rainy";

interface WeatherData {
  condition: string;
  temperature: number;
  icon: WeatherIcon;
}

const mockWeatherSet: WeatherData[] = [
  {
    condition: "맑음",
    temperature: 25,
    icon: "sunny",
  },
  {
    condition: "구름 많음",
    temperature: 22,
    icon: "cloudy",
  },
  {
    condition: "비",
    temperature: 19,
    icon: "rainy",
  },
];

const weatherIndex = ref(0);
const weatherData = computed(() => mockWeatherSet[weatherIndex.value]);
const locationText = ref("");
const locationError = ref("");
const { getCurrentLocation } = useLocation();

const updateLocationFromGps = async () => {
  try {
    const coords = await getCurrentLocation();
    const region = await getRegionName(coords.lat, coords.lng);
    locationText.value = `${region.address.city} ${region.address.borough}`;
    locationError.value = "";
  } catch {
    locationError.value = "위치 권한이 거부되었거나 위치를 가져올 수 없습니다.";
  }
};

const cycleWeather = () => {
  weatherIndex.value = (weatherIndex.value + 1) % mockWeatherSet.length;
};

onMounted(() => {
  updateLocationFromGps();
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #8ed0ff 0%, #d9f0ff 50%, #f6fbff 100%);
  padding: 24px;
}

.weather-card {
  width: min(360px, 100%);
  border-radius: 24px;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  box-shadow: 0 12px 30px #1d4c7a29;
  padding: 28px 24px 32px;
  text-align: center;
}

.label {
  margin: 0 0 8px;
  color: #4c6f8f;
  font-size: 14px;
}

.location-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #17446d;
  font-weight: 600;
}

.gps-icon {
  position: relative;
  width: 18px;
  height: 18px;
  border: 2px solid #2c83c9;
  border-radius: 50%;
  box-sizing: border-box;
}

.gps-icon::before,
.gps-icon::after {
  content: "";
  position: absolute;
  background: #2c83c9;
}

.gps-icon::before {
  width: 2px;
  height: 24px;
  top: -5px;
  left: 6px;
}

.gps-icon::after {
  width: 24px;
  height: 2px;
  top: 6px;
  left: -5px;
}

.location-text {
  margin: 0;
}

.location-error {
  margin: 8px 0 0;
  font-size: 12px;
  color: #b34141;
}

.weather-icon {
  margin: 24px auto 16px;
  width: 104px;
  height: 104px;
  position: relative;
}

.icon-sunny {
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle, #ffd866 0%, #ffb646 70%);
  box-shadow: 0 0 0 10px #ffd15e42, 0 0 36px #ffb03899;
}

.sun-core {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: #fff8d1;
}

.weather-text {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #254f75;
}

.temperature {
  margin: 6px 0 0;
  font-size: 40px;
  line-height: 1;
  font-weight: 800;
  color: #123e63;
}

.icon-cloudy,
.icon-rainy {
  display: block;
}

.cloud {
  position: absolute;
  border-radius: 999px;
  background: #f2f8ff;
  box-shadow: 0 8px 18px #274e7226;
}

.cloud-main {
  width: 78px;
  height: 42px;
  left: 14px;
  top: 30px;
}

.cloud-sub {
  width: 52px;
  height: 30px;
  left: 42px;
  top: 18px;
}

.icon-rainy .cloud-main {
  left: 18px;
  top: 22px;
}

.drop {
  position: absolute;
  width: 6px;
  height: 14px;
  border-radius: 999px;
  background: linear-gradient(180deg, #8bd3ff 0%, #2f8fcf 100%);
}

.drop-1 {
  left: 34px;
  top: 68px;
}

.drop-2 {
  left: 50px;
  top: 72px;
}

.drop-3 {
  left: 66px;
  top: 68px;
}

.change-button {
  margin-top: 18px;
  border: 0;
  border-radius: 999px;
  padding: 10px 14px;
  background: #2c83c9;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.change-button:hover {
  background: #206ca8;
}
</style>
