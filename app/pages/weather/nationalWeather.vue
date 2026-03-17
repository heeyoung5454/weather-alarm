<template>
  <div class="national-weather-page">
    <header class="page-header">
      <NuxtLink to="/" class="back-button">
        <svg class="back-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M5 12l7 7m-7-7l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </NuxtLink>
      <h1 class="page-title">전국 날씨</h1>
    </header>

    <div class="content-container">
      <!-- 로딩 -->
      <div v-if="isLoading" class="loading-container">
        <div class="spinner"></div>
        <p class="loading-text">전국 날씨 정보를 불러오는 중...</p>
      </div>

      <!-- 지도 및 날씨 정보 -->
      <div v-else class="map-container">
        <div class="map-wrapper">
          <!-- 배경 지도 이미지 -->
          <img src="@/assets/images/national_map.png" alt="대한민국 지도" class="map-image" />

          <!-- 클릭 가능한 지역 영역 -->
          <div
            v-for="region in regions"
            :key="region.name"
            class="region-area"
            :class="{ active: selectedRegion === region.name }"
            :style="{
              left: `${region.position.x}%`,
              top: `${region.position.y}%`,
            }"
            @click="selectRegion(region.name)"
          >
            <div class="region-marker">
              <div class="region-label">{{ region.name }}</div>
              <div class="region-weather">
                <div class="current-temp">{{ region.data?.current?.temp }}°</div>
                <div class="region-icon">{{ getWeatherEmoji(region.data?.current?.sky) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 선택된 지역의 상세 날씨 정보 -->
        <transition name="slide-up">
          <div v-if="selectedRegionData" class="weather-detail-card">
            <div class="detail-header">
              <div class="header-left">
                <h3 class="detail-title">{{ selectedRegion }}</h3>
                <div class="current-weather">
                  <span class="current-temp-large">{{ selectedRegionData.current?.temp }}°C</span>
                  <span class="current-emoji">{{ getWeatherEmoji(selectedRegionData.current?.sky) }}</span>
                </div>
              </div>
              <button class="close-button" @click="selectedRegion = null">✕</button>
            </div>

            <div class="detail-content">
              <!-- 오전 날씨 -->
              <div class="detail-section">
                <div class="section-header">
                  <span class="section-icon">🌅</span>
                  <span class="section-title">오전</span>
                </div>
                <div class="weather-info">
                  <div class="weather-main">
                    <div class="weather-emoji">{{ getWeatherEmoji(selectedRegionData.am?.sky) }}</div>
                    <div class="weather-temp">{{ selectedRegionData.am?.temp }}°C</div>
                  </div>
                  <div class="weather-details">
                    <div class="detail-item">
                      <span class="detail-label">강수확률</span>
                      <span class="detail-value">{{ selectedRegionData.am?.pop }}%</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">날씨</span>
                      <span class="detail-value">{{ getWeatherText(selectedRegionData.am?.sky) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 오후 날씨 -->
              <div class="detail-section">
                <div class="section-header">
                  <span class="section-icon">🌇</span>
                  <span class="section-title">오후</span>
                </div>
                <div class="weather-info">
                  <div class="weather-main">
                    <div class="weather-emoji">{{ getWeatherEmoji(selectedRegionData.pm?.sky) }}</div>
                    <div class="weather-temp">{{ selectedRegionData.pm?.temp }}°C</div>
                  </div>
                  <div class="weather-details">
                    <div class="detail-item">
                      <span class="detail-label">강수확률</span>
                      <span class="detail-value">{{ selectedRegionData.pm?.pop }}%</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">날씨</span>
                      <span class="detail-value">{{ getWeatherText(selectedRegionData.pm?.sky) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </transition>

        <!-- 범례 -->
        <div class="legend">
          <div class="legend-item">
            <span class="legend-icon">☀️</span>
            <span class="legend-text">맑음</span>
          </div>
          <div class="legend-item">
            <span class="legend-icon">🌤️</span>
            <span class="legend-text">구름많음</span>
          </div>
          <div class="legend-item">
            <span class="legend-icon">☁️</span>
            <span class="legend-text">흐림</span>
          </div>
          <div class="legend-item">
            <span class="legend-icon">💧</span>
            <span class="legend-text">강수확률</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { collection, getDocs } from "firebase/firestore";
import { useRegions } from "../../composables/useRegions";

interface RegionWeatherData {
  current?: { temp: string; sky: string };
  am?: { sky: string; temp: string; pop: string };
  pm?: { sky: string; temp: string; pop: string };
}

interface Region {
  name: string;
  position: { x: number; y: number };
  data: RegionWeatherData;
}

const isLoading = ref(true);
const regions = ref<Region[]>([]);
const selectedRegion = ref<string | null>(null);
const { regionsByName, fetchRegions } = useRegions();
// @ts-ignore - Nuxt auto-import
const router = useRouter();
// @ts-ignore - Nuxt auto-import
const { $db } = useNuxtApp();

// 선택된 지역의 날씨 데이터
const selectedRegionData = computed(() => {
  if (!selectedRegion.value) return null;
  const region = regions.value.find((r) => r.name === selectedRegion.value);
  return region?.data || null;
});

// 지역 선택 함수 - 상세 날씨 페이지로 이동
const selectRegion = (regionName: string) => {
  selectedRegion.value = regionName;
  router.push(`/alarm/notiWeather?region=${encodeURIComponent(regionName)}`);
};

// 하늘 상태 코드에 따른 이모지 반환
const getWeatherEmoji = (sky?: string) => {
  if (!sky) return "❓";
  // code or text 모두 지원
  if (sky === "1" || sky === "맑음") return "☀️";
  if (sky === "3" || sky === "구름많음") return "🌤️";
  if (sky === "4" || sky === "흐림") return "☁️";
  return "❓";
};

// 하늘 상태 텍스트 반환
const getWeatherText = (sky?: string) => {
  if (!sky) return "정보 없음";
  if (sky === "1") return "맑음";
  if (sky === "3") return "구름많음";
  if (sky === "4") return "흐림";
  if (sky === "맑음" || sky === "구름많음" || sky === "흐림") return sky;
  return "정보 없음";
};

// 하늘 상태 코드 반환 (배경색 클래스용)
const getWeatherCode = (sky?: string) => {
  if (!sky) return "unknown";
  if (sky === "1" || sky === "맑음") return "sunny";
  if (sky === "3" || sky === "구름많음") return "cloudy";
  if (sky === "4" || sky === "흐림") return "overcast";
  return "unknown";
};

// 전국 날씨 데이터 로드
const loadNationalWeather = async () => {
  isLoading.value = true;
  const regionMap = regionsByName.value;
  const regionNames = Object.keys(regionMap);
  const cacheSnap = await getDocs(collection($db, "regionWeatherCache"));
  const cacheByName: Record<string, { temp?: number; sky?: string; updatedAt?: any }> = {};
  cacheSnap.docs.forEach((d) => {
    cacheByName[d.id] = d.data() as any;
  });

  regions.value = regionNames.map((name, index) => {
    const r = regionMap[name];
    const cached = cacheByName[name];
    return {
      name,
      position: { x: r.x, y: r.y },
      data: {
        current: {
          temp: cached?.temp !== undefined ? String(cached.temp) : "-",
          sky: cached?.sky ?? "",
        },
      },
    };
  });

  isLoading.value = false;
};

onMounted(async () => {
  await fetchRegions();
  loadNationalWeather();
});
</script>

<style scoped>
.national-weather-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #8ed0ff 0%, #d9f0ff 50%, #f6fbff 100%);
  padding: 24px;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
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

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #17446d;
}

.content-container {
  max-width: 800px;
  margin: 0 auto;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 12px 30px #1d4c7a29;
  box-sizing: border-box;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
}

.spinner {
  width: 48px;
  height: 48px;
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
  font-size: 16px;
  font-weight: 600;
  color: #4c6f8f;
}

.map-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.map-wrapper {
  position: relative;
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}

.map-image {
  width: 100%;
  height: auto;
  display: block;
  opacity: 0.4;
  filter: grayscale(30%);
}

.region-area {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 10;
  cursor: pointer;
  transition: all 0.3s;
}

.region-area:hover .region-marker {
  transform: scale(1.15);
  box-shadow: 0 6px 16px rgba(29, 76, 122, 0.3);
}

.region-area.active .region-marker {
  background: #2c83c9;
  color: white;
  transform: scale(1.2);
  box-shadow: 0 8px 20px rgba(44, 131, 201, 0.5);
}

.region-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: #ffffffee;
  backdrop-filter: blur(8px);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(29, 76, 122, 0.15);
  transition: all 0.3s;
  min-width: 60px;
}

.region-label {
  font-size: 12px;
  font-weight: 700;
  color: #17446d;
  white-space: nowrap;
}

.region-area.active .region-label {
  color: white;
}

.region-weather {
  display: flex;
  align-items: center;
  flex-direction: column;
}

.current-temp {
  font-size: 13px;
  font-weight: 700;
  color: #2c83c9;
}

.region-area.active .current-temp {
  color: white;
}

.region-icon {
  font-size: 22px;
}

/* 상세 날씨 카드 */
.weather-detail-card {
  margin-top: 24px;
  width: 100%;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
  background: #ffffffee;
  backdrop-filter: blur(8px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(29, 76, 122, 0.2);
  animation: slideUp 0.3s ease-out;
  box-sizing: border-box;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #d0e4f5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.detail-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #17446d;
}

.current-weather {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f0f7ff;
  border-radius: 8px;
}

.current-temp-large {
  font-size: 24px;
  font-weight: 800;
  color: #2c83c9;
}

.current-emoji {
  font-size: 28px;
}

.close-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #f0f7ff;
  color: #5a7a94;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: #2c83c9;
  color: white;
  transform: rotate(90deg);
}

.detail-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.detail-section {
  background: #f6fbff;
  border-radius: 12px;
  padding: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.section-icon {
  font-size: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #17446d;
}

.weather-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.weather-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.weather-emoji {
  font-size: 48px;
}

.weather-temp {
  font-size: 32px;
  font-weight: 800;
  color: #2c83c9;
}

.weather-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 8px;
}

.detail-label {
  font-size: 12px;
  font-weight: 600;
  color: #5a7a94;
}

.detail-value {
  font-size: 14px;
  font-weight: 700;
  color: #17446d;
}

.legend {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 16px;
  background: #f6fbff;
  border-radius: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-icon {
  font-size: 18px;
}

.legend-text {
  font-size: 13px;
  font-weight: 600;
  color: #5a7a94;
}

@media (max-width: 768px) {
  .national-weather-page {
    padding: 16px;
  }

  .content-container {
    padding: 20px;
  }

  .page-title {
    font-size: 20px;
  }

  .region-marker {
    padding: 6px 8px;
    min-width: 40px;
  }

  .region-label {
    font-size: 10px;
  }

  .current-temp {
    font-size: 11px;
  }

  .region-icon {
    font-size: 18px;
  }

  .detail-title {
    font-size: 18px;
  }

  .current-temp-large {
    font-size: 20px;
  }

  .current-emoji {
    font-size: 24px;
  }

  .detail-content {
    grid-template-columns: 1fr;
  }

  .weather-emoji {
    font-size: 36px;
  }

  .weather-temp {
    font-size: 24px;
  }
}
</style>
