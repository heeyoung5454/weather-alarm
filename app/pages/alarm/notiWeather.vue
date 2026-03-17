<template>
  <div class="page">
    <div class="content">
      <div class="top-actions">
        <NuxtLink to="/weather/nationalWeather" class="icon-link" aria-label="전국 날씨">
          <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </NuxtLink>
        <NuxtLink to="/" class="icon-link primary" aria-label="홈">
          <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6a2 2 0 0 0-2-2H11a2 2 0 0 0-2 2v6H4a1 1 0 0 1-1-1V10.5Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </svg>
        </NuxtLink>
      </div>

      <template v-if="!regionParam">
        <p class="error-text">지역 정보가 없습니다. URL에 region 파라미터를 넣어주세요.</p>
        <p class="hint">예: /alarm/notiWeather?region=서울</p>
      </template>

      <template v-else-if="!regionCoords">
        <p class="error-text">알 수 없는 지역입니다: {{ regionParam }}</p>
      </template>

      <template v-else>
        <h1 class="region-title">{{ regionParam }} 날씨</h1>

        <div v-if="isLoading" class="loading-wrap">
          <div class="spinner"></div>
          <p>날씨를 불러오는 중...</p>
        </div>

        <div v-else-if="weatherError" class="error-text">
          {{ weatherError }}
        </div>

        <section v-else>
          <div class="weather-card">
            <p class="now-time">{{ nowDate }} {{ nowTime }} 기준</p>
            <div class="weather-icon" :class="getWeatherIcon(weatherList?.sky?.value)" aria-hidden="true"></div>
            <p class="weather-text">{{ weatherList?.sky?.text }}</p>
            <p class="temperature">{{ weatherList?.t1h?.value ? weatherList.t1h.value + "°C" : "" }}</p>
          </div>

          <section v-if="hourlyForecast.length" class="hourly-section">
            <h2 class="hourly-title">시간대별 날씨</h2>
            <div ref="chartWrapRef" class="chart-wrap">
              <div class="line-chart" :style="{ width: lineChartWidth + 'px', minWidth: lineChartWidth + 'px' }">
                <svg class="chart-svg" :viewBox="lineChartViewBox" preserveAspectRatio="none">
                  <polyline v-if="lineChartPoints" class="chart-line" vector-effect="non-scaling-stroke" :points="lineChartPoints" fill="none" />
                  <circle v-for="(pt, i) in lineChartCoords" :key="i" class="chart-dot" vector-effect="non-scaling-stroke" :cx="pt.x" :cy="pt.y" r="3" />
                </svg>
              </div>
              <div class="chart-labels" :style="{ width: lineChartWidth + 'px', minWidth: lineChartWidth + 'px' }">
                <article v-for="slot in hourlyForecast" :key="slot.time" class="hourly-slot" :style="{ width: (hourlyForecast.length ? lineChartWidth / hourlyForecast.length : 44) + 'px' }">
                  <p class="hourly-time">{{ slot.time }}</p>
                  <div class="hourly-icon" :class="getWeatherIcon(slot.sky)" aria-hidden="true"></div>
                  <p class="hourly-temp">{{ slot.temp !== "-" ? slot.temp + "°" : "-" }}</p>
                </article>
              </div>
            </div>
          </section>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useRoute } from "vue-router";
import { getUltraSrtNcst, getUltraSrtFcst, getVilageFcst } from "../../composables/useWeather";
import { getBaseDateTime, getFcstBaseTime, getVilageFcstBaseDateTime } from "../../utils/timeConvert";
import { useRegions } from "../../composables/useRegions";

const route = useRoute();
const { regionsByName, fetchRegions } = useRegions();

const regionParam = computed(() => {
  const r = route.query.region;
  return typeof r === "string" ? r.trim() : "";
});

const regionCoords = computed(() => {
  if (!regionParam.value) return null;
  const region = regionsByName.value[regionParam.value];
  if (!region) return null;
  return { lat: region.lat, lon: region.lon };
});

const isLoading = ref(true);
const weatherError = ref("");
const nowTime = ref("");
const nowDate = ref("");
const weatherList = ref<Record<string, { value?: string; text?: string }>>({});

/** 시간대별 예보 { time: "06:30", sky: "1", temp: "22" } */
const hourlyForecast = ref<Array<{ time: string; sky: string; temp: string }>>([]);

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

const getWeatherIcon = (sky?: string) => {
  if (sky === "1") return "icon-sunny";
  if (sky === "3") return "icon-cloudy";
  if (sky === "4") return "icon-rainy";
  return "unknown";
};

const CHART_PAD = 12;
const CHART_H = 100;

const chartWrapRef = ref<HTMLElement | null>(null);
/** 컨테이너 기준 반응형 너비 (ResizeObserver로 갱신) */
const containerChartWidth = ref(340);
let resizeObserver: ResizeObserver | null = null;

function updateChartWidth() {
  if (!chartWrapRef.value) return;
  const padding = 32;
  containerChartWidth.value = Math.max(300, chartWrapRef.value.clientWidth - padding);
}

/** 차트/라벨에 사용하는 너비 (반응형) */
const lineChartWidth = computed(() => {
  const n = hourlyForecast.value.length;
  if (!n) return containerChartWidth.value;
  return containerChartWidth.value;
});

watch(
  () => hourlyForecast.value.length,
  (len) => {
    if (len === 0) return;
    nextTick(() => {
      if (!chartWrapRef.value) return;
      updateChartWidth();
      if (resizeObserver) return;
      resizeObserver = new ResizeObserver(updateChartWidth);
      resizeObserver.observe(chartWrapRef.value);
    });
  },
  { immediate: true }
);

onUnmounted(() => {
  if (chartWrapRef.value && resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

/** 라인차트용 기온 범위 */
const hourlyTempRange = computed(() => {
  const temps = hourlyForecast.value.map((s) => (s.temp !== "-" ? Number(s.temp) : null)).filter((n): n is number => n !== null);
  if (temps.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const padding = max === min ? 2 : 0;
  return { min: min - padding, max: max + padding };
});

/** 라인차트 좌표 배열 { x, y } - 슬롯과 1:1로 맞추기 위해 각 열의 가운데에 점 배치 */
const lineChartCoords = computed(() => {
  const list = hourlyForecast.value;
  const w = lineChartWidth.value;
  const { min, max } = hourlyTempRange.value;
  const range = max - min || 1;
  const n = list.length;
  if (n === 0) return [];
  const colWidth = w / n;
  return list.map((slot, i) => {
    const x = (i + 0.5) * colWidth;
    const temp = slot.temp !== "-" ? Number(slot.temp) : min;
    const ratio = (temp - min) / range;
    const y = CHART_H - CHART_PAD - ratio * (CHART_H - CHART_PAD * 2);
    return { x, y };
  });
});

const lineChartViewBox = computed(() => `0 0 ${lineChartWidth.value} ${CHART_H}`);

const lineChartPoints = computed(() => {
  const coords = lineChartCoords.value;
  return coords.map((p) => `${p.x},${p.y}`).join(" ");
});

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
  hourlyForecast.value = [];

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

    // 시간대별 예보: 단기예보로 현재시간 ~ 다음날 24시까지
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const firstSlotHour = Math.ceil((hour + (minute > 0 ? 1 : 0)) / 3) * 3;
    const firstSlotTime = firstSlotHour >= 24 ? "2400" : String(firstSlotHour).padStart(2, "0") + "00";

    const { baseDate: vilageBaseDate } = getVilageFcstBaseDateTime();
    const todayStr = vilageBaseDate;
    const tomorrowDate = new Date(parseInt(todayStr.slice(0, 4), 10), parseInt(todayStr.slice(4, 6), 10) - 1, parseInt(todayStr.slice(6, 8), 10) + 1);
    const tomorrowStr = tomorrowDate.getFullYear() + String(tomorrowDate.getMonth() + 1).padStart(2, "0") + String(tomorrowDate.getDate()).padStart(2, "0");

    let vilageItems: Array<{ category: string; fcstDate: string; fcstTime: string; fcstValue: string }> = [];
    try {
      const { baseDate: vDate, baseTime: vTime } = getVilageFcstBaseDateTime();
      const vilageRes = await getVilageFcst(coords.lat, coords.lon, vDate, vTime);
      if (vilageRes?.response?.body?.items?.item) {
        vilageItems = vilageRes.response.body.items.item;
      }
    } catch {
      // 단기예보 실패 시 기존 초단기예보 6시간만 유지
      const byTime = new Map<string, { sky: string; t1h: string }>();
      fcstItems.forEach((item: { category: string; fcstDate: string; fcstTime: string; fcstValue: string }) => {
        const key = `${item.fcstDate}_${item.fcstTime}`;
        if (!byTime.has(key)) byTime.set(key, { sky: "1", t1h: "-" });
        const cur = byTime.get(key)!;
        if (item.category === "SKY") cur.sky = item.fcstValue;
        if (item.category === "T1H") cur.t1h = item.fcstValue;
      });
      const sortedKeys = Array.from(byTime.keys()).sort();
      hourlyForecast.value = sortedKeys.map((key) => {
        const [, time] = key.split("_");
        const t = byTime.get(key)!;
        const timeStr = time.length >= 4 ? `${time.slice(0, 2)}:${time.slice(2, 4)}` : time;
        return { time: timeStr, sky: t.sky, temp: t.t1h };
      });
      return;
    }

    const byTimeVilage = new Map<
      string,
      { dateStr: string; timeStr: string; sky: string; tmp: string }
    >();
    vilageItems.forEach((item) => {
      const key = `${item.fcstDate}_${item.fcstTime}`;
      const timeStr = item.fcstTime.padStart(4, "0");
      if (!byTimeVilage.has(key)) {
        byTimeVilage.set(key, {
          dateStr: item.fcstDate,
          timeStr,
          sky: "1",
          tmp: "-",
        });
      }
      const cur = byTimeVilage.get(key)!;
      if (item.category === "SKY") cur.sky = item.fcstValue;
      if (item.category === "TMP") cur.tmp = item.fcstValue;
    });

    // 현재 시각 기준 ~ 24시간 뒤까지의 3시간 단위 예보만 사용
    const start = new Date();
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const entries: Array<{ dt: Date; sky: string; tmp: string }> = [];
    byTimeVilage.forEach((v) => {
      const y = Number(v.dateStr.slice(0, 4));
      const m = Number(v.dateStr.slice(4, 6)) - 1;
      const d = Number(v.dateStr.slice(6, 8));
      const hh = Number(v.timeStr.slice(0, 2));
      const mm = Number(v.timeStr.slice(2, 4));
      const dt = new Date(y, m, d, hh, mm);
      if (dt >= start && dt < end) {
        entries.push({ dt, sky: v.sky, tmp: v.tmp });
      }
    });

    // 시간 순 정렬 후, 3시간(0,3,6,9,12,15,18,21시) 단위만 사용
    entries.sort((a, b) => a.dt.getTime() - b.dt.getTime());

    hourlyForecast.value = entries
      .filter((e) => {
        const h = e.dt.getHours();
        const m = e.dt.getMinutes();
        return m === 0 && h % 3 === 0;
      })
      .map((e) => {
        const hh = String(e.dt.getHours()).padStart(2, "0");
        const mm = String(e.dt.getMinutes()).padStart(2, "0");
        return {
          time: `${hh}:${mm}`,
          sky: e.sky,
          temp: e.tmp,
        };
      });
  } catch {
    weatherError.value = "날씨정보를 확인할 수 없습니다.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await fetchRegions();
  if (regionCoords.value) {
    fetchWeather();
  } else {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.page {
  min-height: 100vh;
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
  border: 1px solid #2c83c9;
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

.region-title {
  margin: 0 0 20px;
  font-size: 22px;
  font-weight: 800;
  color: #17446d;
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

.hourly-section {
  margin-top: 24px;
}

.hourly-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 700;
  color: #17446d;
}

.chart-wrap {
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(29, 76, 122, 0.12);
  width: 100%;
  box-sizing: border-box;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.chart-wrap::-webkit-scrollbar {
  height: 6px;
}

.chart-wrap::-webkit-scrollbar-thumb {
  background: #b8d4e8;
  border-radius: 3px;
}

.line-chart {
  flex-shrink: 0;
  height: 120px;
}

.chart-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.chart-line {
  stroke: #2c83c9;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chart-dot {
  fill: #2c83c9;
  stroke: #fff;
  stroke-width: 1.5;
}

.chart-labels {
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  flex-shrink: 0;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(44, 131, 201, 0.2);
}

.hourly-slot {
  flex-shrink: 0;
  width: 44px;
  padding: 6px 4px;
  text-align: center;
}

.hourly-time {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 600;
  color: #6b8399;
}

.hourly-icon {
  width: 28px;
  height: 28px;
  margin: 0 auto 4px;
}

.hourly-icon.icon-sunny {
  background: url("@/assets/images/icon-sunny.png") no-repeat center center / contain;
}

.hourly-icon.icon-cloudy {
  background: url("@/assets/images/icon-cloudy.png") no-repeat center center / contain;
}

.hourly-icon.icon-rainy {
  background: url("@/assets/images/icon-rainy.png") no-repeat center center / contain;
}

.hourly-temp {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #254f75;
}
</style>
