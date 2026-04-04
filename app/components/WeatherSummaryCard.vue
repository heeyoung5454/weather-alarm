<template>
  <section class="weather-card">
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p class="loading-text">{{ loadingText }}</p>
    </div>

    <div v-else-if="errorOverlayText" class="card-error-overlay">
      {{ errorOverlayText }}
    </div>

    <div v-else-if="weatherErrorText" class="card-error-overlay">
      {{ weatherErrorText }}
    </div>

    <template v-else>
      <div class="card-top">
        <div
          v-if="locationText"
          class="location-row"
          :class="{ interactive: interactive !== false }"
          :role="interactive !== false ? 'button' : undefined"
          :tabindex="interactive !== false ? 0 : undefined"
          :aria-label="interactive !== false ? '내 지역 선택 열기' : undefined"
          @click="interactive !== false ? emit('open-region-picker') : undefined"
          @keydown.enter.prevent="interactive !== false ? emit('open-region-picker') : undefined"
          @keydown.space.prevent="interactive !== false ? emit('open-region-picker') : undefined"
        >
          <button type="button" class="gps-icon" aria-label="현재 위치 업데이트" :disabled="interactive === false" @click.stop="interactive !== false ? emit('refresh-location') : undefined"></button>
          <p class="location-text">
            <span class="location-label">{{ locationLabel }}</span>
            <span class="location-value">{{ locationText }}</span>
            <span class="now-time">{{ nowDate }} {{ nowTime }} 기준</span>
          </p>
        </div>
      </div>

      <div class="card-content">
        <div class="weather-icon" :class="iconClass" aria-hidden="true"></div>
        <p class="weather-text">{{ weatherText }}</p>
        <p class="temperature">{{ temperatureText }}</p>
      </div>
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
    /** 위치 관련 전체 카드 오버레이 (권한 거부 등) */
    errorOverlayText?: string;
    /** 날씨 API 실패 등 — 위치 오버레이 다음 우선순위 */
    weatherErrorText?: string;
    locationText?: string;
    locationLabel?: string;
    interactive?: boolean;
    regionOptions?: { key: string; label: string }[];
    regionValue?: string;
  }>(),
  {
    iconClass: "unknown",
    weatherText: "",
    temperatureText: "",
    loading: false,
    loadingText: "날씨 정보를 불러오는 중...",
    errorOverlayText: "",
    weatherErrorText: "",
    locationText: "",
    locationLabel: "현재 위치",
    interactive: true,
    regionOptions: undefined,
    regionValue: "",
  }
);

const emit = defineEmits<{
  (e: "refresh-location"): void;
  (e: "change-region", key: string): void;
  (e: "open-region-picker"): void;
}>();
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
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.card-top {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  text-align: left;
}

.card-content {
  width: 100%;
  text-align: center;
}

.location-row {
  flex: 1 1 auto;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(23, 68, 109, 0.14);
  background: transparent;
  transition:
    transform 0.15s ease,
    background 0.15s ease;
}

.location-row.interactive {
  cursor: pointer;
}

.location-row.interactive:hover {
  transform: translateY(-1px);
  background: rgba(232, 244, 255, 0.82);
}

.location-row.interactive:focus-visible {
  outline: 3px solid rgba(44, 131, 201, 0.28);
  outline-offset: 2px;
}

.gps-icon {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(23, 68, 109, 0.16);
  background: rgba(232, 244, 255, 0.85) url("@/assets/icon/gps.png") no-repeat center center / 18px 18px;
  cursor: pointer;
  flex: 0 0 auto;
  transition:
    transform 0.15s ease,
    background 0.15s ease;
}

.gps-icon:hover {
  transform: translateY(-1px);
  background: rgba(232, 244, 255, 1) url("@/assets/icon/gps.png") no-repeat center center / 18px 18px;
}

.gps-icon:active {
  transform: translateY(0);
}

.location-text {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.location-label {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: -0.2px;
  color: rgba(23, 68, 109, 0.7);
}

.location-value {
  font-size: 13px;
  font-weight: 800;
  color: #17446d;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.card-error-overlay {
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

/* (moved to top styles: pill UI for location row) */

.now-time {
  font-size: 11px;
  color: #6b8399;
  display: block;
}

.weather-icon {
  margin: 0 auto 12px;
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
