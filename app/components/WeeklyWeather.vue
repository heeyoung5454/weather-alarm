<template>
  <section class="weekly-forecast">
    <h2 class="section-title">주간 날씨</h2>

    <div class="content-wrapper">
      <!-- 로딩 오버레이 -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="spinner"></div>
        <p class="loading-text">주간 예보를 불러오는 중...</p>
      </div>

      <!-- 위치 에러 메시지 -->
      <div v-if="props.locationError" class="error-message">
        {{ props.locationError }}
      </div>

      <div v-if="!props.locationError" class="scroll-container">
        <article v-for="day in weeklyWeather" :key="day.date" class="day-card">
          <p class="date">{{ formatDate(day.date) }}</p>
          <div class="day-icon" :class="getWeatherIconClass(day.sky)"></div>
          <div class="temp-range">
            <span class="temp-max">{{ day.maxTemp }}°</span>
            <span class="temp-min">{{ day.minTemp }}°</span>
          </div>
          <p class="pop">💧 {{ day.pop }}%</p>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

import { getVilageFcst } from "../composables/useWeather";
import { getVilageFcstBaseDateTime } from "../utils/timeConvert";
import { groupByDate, summarizeDay } from "../utils/forecast";

const props = defineProps<{
  lat: number;
  lng: number;
  locationError: string;
}>();

const weeklyWeather = ref([]);
const isLoading = ref(true);

// YYYYMMDD -> MM/DD 형식으로 변환
const formatDate = (dateStr: string) => {
  if (!dateStr || dateStr.length !== 8) return "";
  return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
};

// 하늘 상태 코드로 아이콘 클래스 반환
const getWeatherIconClass = (sky: string) => {
  if (sky === "1") return "icon-sunny";
  if (sky === "3") return "icon-cloudy";
  if (sky === "4") return "icon-rainy";
  return "";
};

const fetchWeeklyWeather = async (lat: number, lng: number) => {
  try {
    const { baseDate, baseTime } = getVilageFcstBaseDateTime();

    const res = await getVilageFcst(lat, lng, baseDate, baseTime);
    const items = res.response.body.items.item;

    // 날짜별 요약
    const daily = Object.values(groupByDate(items)).map(summarizeDay);
    weeklyWeather.value = daily;
  } catch (error) {
    console.error("주간 날씨 조회 실패:", error);
    weeklyWeather.value = [];
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => [props.lat, props.lng, props.locationError],
  () => {
    // 위치 에러가 있으면 로딩 해제
    if (props.locationError) {
      isLoading.value = false;
      return;
    }

    // 위치 정보가 있으면 주간 날씨 조회
    if (props.lat && props.lng) {
      isLoading.value = true;
      fetchWeeklyWeather(props.lat, props.lng);
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.weekly-forecast {
  width: 100%;
  box-sizing: border-box;
}

.content-wrapper {
  position: relative;
  min-height: 380px;
  width: 100%;
  box-sizing: border-box;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #ffffffdd;
  backdrop-filter: blur(6px);
  border-radius: 16px;
  z-index: 10;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #d9f0ff;
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
  font-size: 13px;
  font-weight: 600;
  color: #4c6f8f;
}

.error-message {
  padding: 20px 16px;
  background: #ffffffcc;
  backdrop-filter: blur(4px);
  border-radius: 12px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  box-sizing: border-box;
}

.section-title {
  margin: 0 0 12px 2px;
  font-size: 16px;
  font-weight: 700;
  color: #17446d;
  text-align: left;
}

.scroll-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
}

.day-card {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: #ffffffcc;
  backdrop-filter: blur(4px);
  border-radius: 12px;
  box-shadow: 0 4px 12px #1d4c7a1a;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  box-sizing: border-box;
}

.day-card:hover {
  transform: translateX(4px);
  box-shadow: 0 6px 16px #1d4c7a2a;
}

@media (max-width: 340px) {
  .scroll-container {
    overflow-x: auto;
  }

  .scroll-container::-webkit-scrollbar {
    height: 6px;
  }

  .scroll-container::-webkit-scrollbar-thumb {
    background: #b8d4eb;
    border-radius: 999px;
  }

  .scroll-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .day-card {
    min-width: 320px;
  }
}

.date {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #17446d;
  min-width: 60px;
}

.day-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.icon-sunny {
  background: url("@/assets/images/icon-sunny.png") no-repeat center center / contain;
}

.icon-cloudy {
  background: url("@/assets/images/icon-cloudy.png") no-repeat center center / contain;
}

.icon-rainy {
  background: url("@/assets/images/icon-rainy.png") no-repeat center center / contain;
}

.temp-range {
  display: flex;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  min-width: 80px;
  justify-content: center;
}

.temp-max {
  color: #d94141;
}

.temp-min {
  color: #2c83c9;
}

.pop {
  margin: 0;
  font-size: 13px;
  color: #5a7a94;
  font-weight: 600;
  min-width: 50px;
  text-align: right;
}
</style>
