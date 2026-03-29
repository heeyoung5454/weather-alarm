<template>
  <div class="national-weather-page">
    <header class="page-header">
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
                <div class="region-icon">{{ getWeatherEmoji(region.data?.current?.sky, region.data?.current?.rain) }}</div>
              </div>
            </div>
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
  current?: { temp: string; sky: string; rain?: number };
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
const { regionsByName, fetchRegions } = useRegions();
// @ts-ignore - Nuxt auto-import
const router = useRouter();
// @ts-ignore - Nuxt auto-import
const { $db } = useNuxtApp();

// 지역 선택 함수 - 상세 날씨 페이지로 이동
const selectRegion = (regionName: string) => {
  router.push(`/alarm/notiWeather?region=${encodeURIComponent(regionName)}`);
};

// 하늘 상태 코드에 따른 이모지 반환
// - cache의 rain(PTY)이 있으면 강수를 우선 표시한다.
const getWeatherEmoji = (sky?: string, pty?: number | string) => {
  // 1. 강수 우선
  if (pty === 1) return "🌧️"; // 비
  if (pty === 2) return "🌨️"; // 비/눈
  if (pty === 3) return "❄️"; // 눈
  if (pty === 4) return "🌦️"; // 소나기

  // 2. 하늘 상태 우선
  if (sky === "1") return "☀️";
  if (sky === "3") return "🌤️";
  if (sky === "4") return "☁️";
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
  const cacheByName: Record<string, { temp?: number; sky?: string; rain?: number; updatedAt?: any }> = {};
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
          rain: cached?.rain ?? 0,
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
  min-height: calc(100vh - 164px);
  background: linear-gradient(180deg, #8ed0ff 0%, #d9f0ff 50%, #f6fbff 100%);
  padding: 24px;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #17446d;
  text-align: center;
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

.region-icon {
  font-size: 22px;
}

@media (max-width: 768px) {
  .national-weather-page {
    padding: 24px 16px;
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
}
</style>
