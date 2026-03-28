<template>
  <div class="page">
    <div class="content">
      <div class="top-actions">
        <NuxtLink to="/weather/nationalWeather" class="back-button" aria-label="전국 날씨">
          <svg class="back-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12l7 7m-7-7l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </NuxtLink>
        <NuxtLink to="/" class="icon-link primary" aria-label="홈">
          <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6a2 2 0 0 0-2-2H11a2 2 0 0 0-2 2v6H4a1 1 0 0 1-1-1V10.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
          </svg>
        </NuxtLink>
      </div>

      <template v-if="!regionCoords && !locationLoading">
        <p class="error-text">지역 정보가 없습니다.</p>
        <p class="hint">예: ?region=서울 또는 ?lat=37.5&amp;lng=127.0&amp;label=주소</p>
      </template>

      <template v-if="regionCoords">
        <div v-if="!isLoading && weatherError" class="error-text">
          {{ weatherError }}
        </div>

        <section class="weather-stack">
          <WeatherSummaryCard
            :now-date="nowDate"
            :now-time="nowTime"
            :location-text="locationDisplayText"
            :loading="isLoading"
            :icon-class="getWeatherIcon(weatherList?.sky?.value, weatherList?.pty?.value)"
            :weather-text="weatherList?.pty?.value !== '0' ? weatherList?.pty?.text : weatherList?.sky?.text"
            :temperature-text="weatherList?.t1h?.value ? weatherList.t1h.value + '°C' : ''"
          />

          <HourlyWeatherSection :lat="regionCoords.lat" :lng="regionCoords.lon" />
          <WeeklyWeather :lat="regionCoords.lat" :lng="regionCoords.lon" :location-error="''" />
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { getUltraSrtNcst, getUltraSrtFcst } from "../../composables/useWeather";
import { getBaseDateTime, getFcstBaseTime } from "../../utils/timeConvert";
import { useRegions } from "../../composables/useRegions";
import HourlyWeatherSection from "../../components/HourlyWeatherSection.vue";
import WeatherSummaryCard from "../../components/WeatherSummaryCard.vue";
import WeeklyWeather from "../weather/components/WeeklyWeather.vue";

const route = useRoute();
const { regionsByName, fetchRegions } = useRegions();

const regionParam = computed(() => {
  const r = route.query.region;
  return typeof r === "string" ? r.trim() : "";
});

const regionCoords = computed(() => {
  const latQ = route.query.lat;
  const lngQ = route.query.lng ?? route.query.lon;
  if (typeof latQ === "string" && typeof lngQ === "string") {
    const lat = parseFloat(latQ);
    const lng = parseFloat(lngQ);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lon: lng };
    }
  }
  if (!regionParam.value) return null;
  const region = regionsByName.value[regionParam.value];
  if (!region) return null;
  return { lat: region.lat, lon: region.lon };
});

const locationDisplayText = computed(() => {
  const lab = route.query.label;
  if (typeof lab === "string" && lab.trim()) return lab.trim();
  return regionParam.value || "날씨";
});

const locationLoading = ref(true);

const isLoading = ref(true);
const weatherError = ref("");
const nowTime = ref("");
const nowDate = ref("");
const weatherList = ref<Record<string, { value?: string; text?: string }>>({});

const SKYMap: Record<string, string> = { "1": "맑음", "3": "구름많음", "4": "흐림" };
const PTYMap: Record<string, string> = {
  "0": "강수 없음",
  "1": "비",
  "2": "비/눈",
  "3": "눈",
  "5": "빗방울",
  "6": "빗방울/눈날림",
  "7": "눈날림",
};

const getWeatherIcon = (sky?: string, pty?: string) => {
  // 1. 강수형태(PTY)가 있으면 비/눈 아이콘 우선
  if (pty && pty !== "0") {
    // 비, 비/눈, 빗방울 계열은 비 아이콘
    if (pty === "1" || pty === "2" || pty === "5" || pty === "6") return "icon-rainy";
    // 눈 계열
    if (pty === "3" || pty === "7") return "icon-snow";
  }

  // 2. PTY 없으면 하늘 상태(SKY) 기준
  if (sky === "1") return "icon-sunny";
  if (sky === "3") return "icon-suncloudy"; // 구름많음
  if (sky === "4") return "icon-cloudy"; // 흐림
  return "unknown";
};

const convertWeatherToObject = (ncstData: Record<string, string>, fcstData?: Record<string, string>) => {
  const sky = fcstData?.SKY;
  const pty = ncstData.PTY;
  return {
    pty: { label: "강수형태", value: pty, text: PTYMap[pty] || "알수없음" },
    sky: { label: "하늘상태", value: sky, text: SKYMap[sky] || "알수없음" },
    reh: { label: "습도", value: ncstData.REH, text: `${ncstData.REH}%` },
    t1h: { label: "기온", value: ncstData.T1H, text: `${ncstData.T1H}°C` },
  };
};

const fetchWeather = async () => {
  const coords = regionCoords.value;
  if (!coords) return;

  isLoading.value = true;
  weatherError.value = "";

  try {
    const { baseDate, baseTime } = getBaseDateTime();
    nowDate.value = baseDate.slice(4, 6) + "월" + baseDate.slice(6, 8) + "일";
    nowTime.value = baseTime.slice(0, 2) + "시";

    const data = await getUltraSrtNcst(coords.lat, coords.lon, baseDate, baseTime);
    if (data.response.header.resultCode !== "00") {
      weatherError.value = "날씨정보를 확인할 수 없습니다.";
      return;
    }

    const ncstItems = data.response.body.items.item;
    if (!Array.isArray(ncstItems) || ncstItems.length === 0) {
      weatherError.value = "날씨정보를 확인할 수 없습니다.";
      return;
    }

    const ncst: Record<string, string> = {};
    ncstItems.forEach((i: { category: string; obsrValue: string }) => {
      ncst[i.category] = i.obsrValue;
    });

    weatherList.value = convertWeatherToObject(ncst);

    const { fctBaseDate, fctBaseTime } = getFcstBaseTime();
    const fcstData = await getUltraSrtFcst(coords.lat, coords.lon, fctBaseDate, fctBaseTime);
    if (fcstData.response.header.resultCode !== "00") return;

    const fcstItems = fcstData.response.body.items.item;
    if (!Array.isArray(fcstItems) || fcstItems.length === 0) return;

    const fcst: Record<string, string> = {};
    fcstItems.forEach((item: { category: string; fcstValue: string }) => {
      if ((item.category === "SKY" || item.category === "LGT") && !fcst[item.category]) {
        fcst[item.category] = item.fcstValue;
      }
    });

    weatherList.value = convertWeatherToObject(ncst, fcst);
  } catch {
    weatherError.value = "날씨정보를 확인할 수 없습니다.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  locationLoading.value = true;
  await fetchRegions();
  locationLoading.value = false;
  if (regionCoords.value) {
    fetchWeather();
  } else {
    isLoading.value = false;
  }
});

watch(
  () => route.query,
  async () => {
    const coords = regionCoords.value;
    if (coords) await fetchWeather();
  },
  { deep: true },
);
</script>

<style scoped>
.page {
  min-height: calc(100vh - 156px);
  background: linear-gradient(180deg, #8ed0ff 0%, #d9f0ff 50%, #f6fbff 100%);
  padding: 24px;
  box-sizing: border-box;
}

.content {
  max-width: 420px;
  margin: 0 auto;
}

.top-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.back-button:hover {
  background: #ffffff;
  transform: scale(1.05);
}

.back-icon {
  width: 20px;
  height: 20px;
  color: #2c83c9;
}

.icon-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(23, 68, 109, 0.22);
  color: #17446d;
  text-decoration: none;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  flex: none;
  white-space: nowrap;
}

.icon-link.primary {
  background: #17446dee;
  color: #ffffff;
}

.icon-link:hover {
  transform: translateY(-1px);
}

.icon-link:active {
  transform: translateY(0);
}

.icon-link:focus-visible {
  outline: 2px solid rgba(142, 208, 255, 0.9);
  outline-offset: 2px;
}

.icon {
  width: 22px;
  height: 22px;
}

.error-text {
  color: #b34141;
  font-weight: 600;
  margin: 0 0 8px;
}

.hint {
  font-size: 14px;
  color: #5a7a94;
  margin: 0;
}

.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: #4c6f8f;
  font-weight: 600;
}

.spinner {
  width: 40px;
  height: 40px;
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

.weather-card {
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  border-radius: 24px;
  padding: 28px 24px;
  text-align: center;
  box-shadow: 0 12px 30px rgba(29, 76, 122, 0.2);
}

.now-time {
  margin: 0 0 16px;
  font-size: 12px;
  color: #6b8399;
}

.weather-icon {
  margin: 0 auto 16px;
  width: 104px;
  height: 104px;
}

.weather-icon.icon-sunny {
  background: url("@/assets/images/icon-sunny.png") no-repeat center center / contain;
}

.weather-icon.icon-cloudy {
  background: url("@/assets/images/icon-cloudy.png") no-repeat center center / contain;
}

.weather-icon.icon-rainy {
  background: url("@/assets/images/icon-rainy.png") no-repeat center center / contain;
}

.weather-icon.icon-snow {
  background: url("@/assets/images/icon-snow.png") no-repeat center center / contain;
}

.weather-icon.icon-suncloudy {
  background: url("@/assets/images/icon-suncloudy.png") no-repeat center center / contain;
}

.weather-text {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #254f75;
}

.temperature {
  margin: 8px 0 0;
  font-size: 40px;
  font-weight: 800;
  color: #123e63;
}

.weather-stack {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
</style>
