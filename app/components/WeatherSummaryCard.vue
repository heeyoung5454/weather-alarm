<template>
  <section class="weather-card">
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p class="loading-text">{{ loadingText }}</p>
    </div>

    <div v-if="errorOverlayText" class="location-error-full">
      {{ errorOverlayText }}
    </div>

    <template v-if="!errorOverlayText">
      <div v-if="locationText" class="location-row">
        <span class="gps-icon" aria-hidden="true"></span>
        <p class="location-text">{{ locationText }}</p>
      </div>

      <p class="now-time">{{ nowDate }} {{ nowTime }} 기준</p>
      <div class="weather-icon" :class="iconClass" aria-hidden="true"></div>
      <p class="weather-text">{{ weatherText }}</p>
      <p class="temperature">{{ temperatureText }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    nowDate: string;
    nowTime: string;
    iconClass?: string;
    weatherText?: string;
    temperatureText?: string;
    loading?: boolean;
    loadingText?: string;
    errorOverlayText?: string;
    locationText?: string;
  }>(),
  {
    iconClass: "unknown",
    weatherText: "",
    temperatureText: "",
    loading: false,
    loadingText: "날씨 정보를 불러오는 중...",
    errorOverlayText: "",
    locationText: "",
  }
);
</script>

<style scoped>
.weather-card {
  width: 100%;
  border-radius: 24px;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  box-shadow: 0 12px 30px #1d4c7a29;
  padding: 28px 24px 32px;
  text-align: center;
  position: relative;
  box-sizing: border-box;
  min-height: 332px;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #ffffffee;
  backdrop-filter: blur(6px);
  border-radius: 24px;
  z-index: 10;
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

.location-error-full {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: #ffffffee;
  backdrop-filter: blur(6px);
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  color: #6b7280;
  text-align: center;
  line-height: 1.6;
  z-index: 5;
  box-sizing: border-box;
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
  font-size: 14px;
  color: #17446d;
  font-weight: 600;
}

.now-time {
  margin: 8px 0 16px;
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
</style>
