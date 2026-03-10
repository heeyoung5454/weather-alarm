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
import { getVilageFcst } from "../../composables/useWeather";
import { getVilageFcstBaseDateTime } from "../../utils/timeConvert";

// 지역별 위도/경도
const regionLatLon = {
  서울: { lat: 37.5665, lon: 126.978 },
  인천: { lat: 37.4563, lon: 126.7052 },
  춘천: { lat: 37.8813, lon: 127.7298 },
  강릉: { lat: 37.7519, lon: 128.8761 },
  수원: { lat: 37.2636, lon: 127.0286 },
  청주: { lat: 36.6424, lon: 127.489 },
  울릉도독도: { lat: 37.4845, lon: 130.9057 },
  안동: { lat: 36.5684, lon: 128.7294 },
  포항: { lat: 36.019, lon: 129.3435 },
  대전: { lat: 36.3504, lon: 127.3845 },
  대구: { lat: 35.8714, lon: 128.6014 },
  전주: { lat: 35.8242, lon: 127.148 },
  울산: { lat: 35.5384, lon: 129.3114 },
  부산: { lat: 35.1796, lon: 129.0756 },
  광주: { lat: 35.1595, lon: 126.8526 },
  여수: { lat: 34.7604, lon: 127.6622 },
  목포: { lat: 34.8118, lon: 126.3922 },
  제주: { lat: 33.4996, lon: 126.5312 },
};

// 지도 이미지상의 위치 (% 단위)
const regionPositions = {
  서울: { x: 29, y: 15 },
  인천: { x: 12, y: 28 },
  춘천: { x: 46, y: 17 },
  강릉: { x: 64, y: 20 },
  수원: { x: 22, y: 43 },
  청주: { x: 41, y: 41 },
  울릉도독도: { x: 90, y: 28 },
  안동: { x: 62, y: 44 },
  포항: { x: 80, y: 47 },
  대전: { x: 34, y: 56 },
  대구: { x: 52, y: 59 },
  전주: { x: 17, y: 58 },
  울산: { x: 80, y: 64 },
  부산: { x: 60, y: 73 },
  광주: { x: 24, y: 71 },
  여수: { x: 38, y: 81 },
  목포: { x: 10, y: 80 },
  제주: { x: 22, y: 94 },
};

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

// 선택된 지역의 날씨 데이터
const selectedRegionData = computed(() => {
  if (!selectedRegion.value) return null;
  const region = regions.value.find((r) => r.name === selectedRegion.value);
  return region?.data || null;
});

// 지역 선택 함수
const selectRegion = (regionName: string) => {
  selectedRegion.value = regionName;
};

// 하늘 상태 코드에 따른 이모지 반환
const getWeatherEmoji = (sky?: string) => {
  if (!sky) return "❓";
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
  return "정보 없음";
};

// 하늘 상태 코드 반환 (배경색 클래스용)
const getWeatherCode = (sky?: string) => {
  if (!sky) return "unknown";
  if (sky === "1") return "sunny";
  if (sky === "3") return "cloudy";
  if (sky === "4") return "overcast";
  return "unknown";
};

// 각 지역의 날씨 데이터 가져오기
const fetchRegionWeather = async (regionName: string, lat: number, lon: number) => {
  try {
    const { baseDate, baseTime } = getVilageFcstBaseDateTime();
    const res = await getVilageFcst(lat, lon, baseDate, baseTime);
    const items = res.response.body.items.item;

    if (!Array.isArray(items)) {
      return null;
    }

    // 현재 시간 기준으로 오늘/내일 날짜 구하기
    const now = new Date();
    const currentHour = now.getHours();

    // 오늘 날짜
    const today = baseDate;

    // 내일 날짜 계산
    const tomorrow = new Date(parseInt(today.slice(0, 4)), parseInt(today.slice(4, 6)) - 1, parseInt(today.slice(6, 8)) + 1);
    const tomorrowStr = tomorrow.getFullYear() + String(tomorrow.getMonth() + 1).padStart(2, "0") + String(tomorrow.getDate()).padStart(2, "0");

    // 오전/오후 시간대 결정 (현재 시간 고려)
    let amDate = today;
    let pmDate = today;

    // 현재 시간이 12시 이후면 오전은 내일로
    if (currentHour >= 12) {
      amDate = tomorrowStr;
    }

    // 현재 시간이 18시 이후면 오후도 내일로
    if (currentHour >= 18) {
      pmDate = tomorrowStr;
    }

    // 오전(06~12시), 오후(12~18시) 데이터 필터링
    const amData = items.filter((item: any) => {
      return item.fcstDate === amDate && item.fcstTime >= "0600" && item.fcstTime <= "1200";
    });

    const pmData = items.filter((item: any) => {
      return item.fcstDate === pmDate && item.fcstTime >= "1200" && item.fcstTime <= "1800";
    });

    // 오전 데이터 추출 (09시 기준)
    const amSky = amData.find((item: any) => item.category === "SKY" && item.fcstTime === "0900")?.fcstValue || amData.find((item: any) => item.category === "SKY")?.fcstValue || "1";
    const amTemp = amData.find((item: any) => item.category === "TMP" && item.fcstTime === "0900")?.fcstValue || amData.find((item: any) => item.category === "TMP")?.fcstValue || "-";
    const amPop = amData.find((item: any) => item.category === "POP" && item.fcstTime === "0900")?.fcstValue || amData.find((item: any) => item.category === "POP")?.fcstValue || "0";

    // 오후 데이터 추출 (15시 기준)
    const pmSky = pmData.find((item: any) => item.category === "SKY" && item.fcstTime === "1500")?.fcstValue || pmData.find((item: any) => item.category === "SKY")?.fcstValue || "1";
    const pmTemp = pmData.find((item: any) => item.category === "TMP" && item.fcstTime === "1500")?.fcstValue || pmData.find((item: any) => item.category === "TMP")?.fcstValue || "-";
    const pmPop = pmData.find((item: any) => item.category === "POP" && item.fcstTime === "1500")?.fcstValue || pmData.find((item: any) => item.category === "POP")?.fcstValue || "0";

    // 현재 시간에 가장 가까운 예보 데이터 찾기
    const currentTime = String(currentHour).padStart(2, "0") + "00";
    const currentDateStr = today;

    // 현재 시간 이후의 가장 가까운 예보 찾기
    const futureItems = items.filter((item: any) => {
      if (item.fcstDate === currentDateStr) {
        return item.fcstTime >= currentTime;
      }
      return item.fcstDate > currentDateStr;
    });

    // 가장 가까운 시간대의 TMP와 SKY 찾기
    const nearestTime = futureItems.length > 0 ? futureItems[0].fcstTime : null;
    const currentTemp = nearestTime ? futureItems.find((item: any) => item.category === "TMP" && item.fcstTime === nearestTime)?.fcstValue || "-" : "-";
    const currentSky = nearestTime ? futureItems.find((item: any) => item.category === "SKY" && item.fcstTime === nearestTime)?.fcstValue || "1" : "1";

    return {
      current: { temp: currentTemp, sky: currentSky },
      am: { sky: amSky, temp: amTemp, pop: amPop },
      pm: { sky: pmSky, temp: pmTemp, pop: pmPop },
    };
  } catch (error) {
    console.error(`${regionName} 날씨 조회 실패:`, error);
    return null;
  }
};

// 전국 날씨 데이터 로드
const loadNationalWeather = async () => {
  isLoading.value = true;

  const regionNames = Object.keys(regionLatLon) as Array<keyof typeof regionLatLon>;
  const weatherPromises = regionNames.map((name) => {
    const { lat, lon } = regionLatLon[name];
    return fetchRegionWeather(name, lat, lon);
  });

  const weatherResults = await Promise.all(weatherPromises);

  regions.value = regionNames.map((name, index) => ({
    name,
    position: regionPositions[name],
    data: weatherResults[index] || {},
  }));

  isLoading.value = false;
};

onMounted(() => {
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
