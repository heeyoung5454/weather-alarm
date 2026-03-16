<template>
  <section class="weather-card">
    <!-- 로딩 오버레이 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p class="loading-text">날씨 정보를 불러오는 중...</p>
    </div>

    <!-- 위치 에러 메시지 -->
    <div v-if="locationError" class="location-error-full">
      {{ locationError }}
    </div>

    <!-- 날씨 정보 (위치 에러가 없을 때만 표시) -->
    <template v-if="!locationError">
      <div class="location-row">
        <span class="gps-icon" aria-hidden="true"></span>
        <p class="location-text">{{ locationText }}</p>
      </div>
      <p class="now-time">{{ nowDate }} {{ nowTime }} 기준</p>

      <!-- 날씨 아이콘 -->
      <div class="weather-icon" :class="getWeatherIcon(weatherList?.sky?.value)" aria-hidden="true"></div>

      <p class="weather-text">{{ weatherError || weatherList?.sky?.text }}</p>
      <p class="temperature">{{ weatherList?.t1h?.value ? weatherList?.t1h?.value + "°C" : "" }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getRegionName } from "../../../utils/reverseGeo";
import { getUltraSrtNcst, getUltraSrtFcst } from "../../../composables/useWeather";
import { getBaseDateTime, getFcstBaseTime } from "../../../utils/timeConvert";

const props = defineProps<{
  initialLat?: number;
  initialLng?: number;
  useSavedLocation?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:position", lat: number, lng: number): void;
  (e: "update:location-error", error: string): void;
}>();

// 하늘 상태 코드로 아이콘 클래스를 매핑한다.
const getWeatherIcon = (sky: string) => {
  if (sky === "1") return "icon-sunny";
  if (sky === "3") return "icon-cloudy";
  if (sky === "4") return "icon-rainy";
  return "unknown";
};

// 화면에 표시할 현재 위치 텍스트
const locationText = ref("");
// 위치 조회 실패 메시지
const locationError = ref("");
// 날씨 API 조회 실패 메시지
const weatherError = ref("");
// API 호출 중 로딩 상태
const isLoading = ref(false);
// 위치 권한 재시도 여부 (무한 루프 방지)
const hasRetriedLocation = ref(false);
// 기준 일시 표기용 상태
const nowTime = ref("");
const nowDate = ref("");
// 가공된 날씨 데이터(SKY, T1H 등)
const weatherList = ref<Record<string, any>>({});

const position = ref({
  lat: 0,
  lng: 0,
});

// 기상청 API 응답을 받아 현재 카드에 필요한 형태로 변환한다.
const fetchWeather = async (lat: number, lng: number) => {
  try {
    const { baseDate, baseTime } = getBaseDateTime();

    nowDate.value = baseDate.slice(4, 6) + "월" + baseDate.slice(6, 8) + "일";
    nowTime.value = baseTime.slice(0, 2) + "시";

    const data = await getUltraSrtNcst(lat, lng, baseDate, baseTime);

    // ncst 응답 에러 체크
    if (data.response.header.resultCode !== "00") {
      weatherError.value = "날씨정보를 확인할수없습니다";
      return;
    }

    const ncstItems = data.response.body.items.item;

    // ncstItems가 배열이고 데이터가 있는지 확인
    if (!Array.isArray(ncstItems) || ncstItems.length === 0) {
      weatherError.value = "날씨정보를 확인할수없습니다";
      return;
    }

    const ncst = {};

    ncstItems.forEach((i) => {
      ncst[i.category] = i.obsrValue;
    });

    weatherList.value = convertWeatherToObject(ncst);

    const { fctBaseDate, fctBaseTime } = getFcstBaseTime();

    // 하늘 정보 조회 하늘상태(SKY), 강수형태(PTY)
    const fcstData = await getUltraSrtFcst(lat, lng, fctBaseDate, fctBaseTime);

    // fcst 응답 에러 체크
    if (fcstData.response.header.resultCode !== "00") {
      weatherError.value = "날씨정보를 확인할수없습니다";
      return;
    }

    const fcstItems = fcstData.response.body.items.item;

    // fcstItems가 배열이고 데이터가 있는지 확인
    if (!Array.isArray(fcstItems) || fcstItems.length === 0) {
      weatherError.value = "날씨정보를 확인할수없습니다";
      return;
    }

    const fcst = {};

    // SKY, LGT만 필터 + 최신 시간 기준
    fcstItems.forEach((item) => {
      if (item.category === "SKY" || item.category === "LGT") {
        // 아직 값이 없거나, 현재 아이템 fcstTime이 더 최근이면 교체
        if (!fcst[item.category] || item.fcstTime > fcst[item.category].fcstTime) {
          fcst[item.category] = item.fcstValue;
        }
      }
    });

    // 정상적으로 데이터를 받았을 때만 화면 업데이트
    weatherList.value = convertWeatherToObject(ncst, fcst);
    weatherError.value = "";
  } catch (error) {
    weatherError.value = "날씨정보를 확인할수없습니다";
  } finally {
    isLoading.value = false;
  }
};

// 코드값 -> 한글 텍스트 매핑 테이블
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

// API 원본 응답을 UI에서 바로 쓰는 객체로 변환한다.
const convertWeatherToObject = (ncstData: Record<string, string>, fcstData?: Record<string, string>) => {
  const sky = fcstData?.SKY;
  const pty = ncstData.PTY;

  return {
    pty: { label: "강수형태", value: pty, text: PTYMap[pty] || "알수없음" },
    sky: { label: "하늘상태", value: sky, text: SKYMap[sky] || "알수없음" },
    reh: { label: "습도", value: ncstData.REH, text: `${ncstData.REH}%` },
    rn1: { label: "1시간강수량", value: ncstData.RN1, text: `${ncstData.RN1} mm` },
    t1h: { label: "기온", value: ncstData.T1H, text: `${ncstData.T1H}°C` },
    uuu: { label: "동서바람성분", value: ncstData.UUU, text: `${ncstData.UUU} m/s` },
    vec: { label: "풍향", value: ncstData.VEC, text: `${ncstData.VEC}°` },
    vvv: { label: "남북바람성분", value: ncstData.VVV, text: `${ncstData.VVV} m/s` },
    wsd: { label: "풍속", value: ncstData.WSD, text: `${ncstData.WSD} m/s` },
  };
};

onMounted(async () => {
  if (props.initialLat && props.initialLng) {
    position.value = {
      lat: props.initialLat,
      lng: props.initialLng,
    };
    locationError.value = "";

    // 저장된 좌표 기준으로 위치 텍스트 설정
    try {
      const region = await getRegionName(props.initialLat, props.initialLng);
      if (region?.address) {
        locationText.value = `${region.address.city ?? ""} ${region.address.borough ?? ""} ${region.address.suburb ?? ""}`.trim();
      }
    } catch {
      // 실패 시 텍스트는 비워 둠
    }

    emit("update:position", props.initialLat, props.initialLng);
    emit("update:location-error", "");
    fetchWeather(props.initialLat, props.initialLng);
  } else {
    locationError.value = "위치 정보를 가져올 수 없습니다.";
    emit("update:location-error", locationError.value);
  }
});
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
}

.location-error {
  margin: 8px 0 0;
  font-size: 12px;
  color: #b34141;
}

.now-time {
  margin: 4px 0 0;
  font-size: 11px;
  color: #6b8399;
}

.weather-icon {
  margin: 24px auto 16px;
  width: 104px;
  height: 104px;
  position: relative;
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
</style>
