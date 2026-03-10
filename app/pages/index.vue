<template>
  <main class="page">
    <div class="page-content">
      <!-- 현재 날씨 -->
      <CurrentWeather @update:position="handlePositionUpdate" @update:location-error="handleLocationError" />

      <!-- 주간 날씨 -->
      <WeeklyWeather :lat="position.lat" :lng="position.lng" :location-error="locationError" />
    </div>
  </main>
</template>

<script setup lang="ts">
import CurrentWeather from "./weather/components/CurrentWeather.vue";
import WeeklyWeather from "./weather/components/WeeklyWeather.vue";

import { ref } from "vue";

const position = ref({
  lat: 0,
  lng: 0,
});

const locationError = ref("");

const handlePositionUpdate = (lat: number, lng: number) => {
  position.value = { lat, lng };
};

const handleLocationError = (error: string) => {
  locationError.value = error;
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
}

.page-content {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
</style>
