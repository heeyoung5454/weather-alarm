<template>
  <section class="hourly-section">
    <h2 class="hourly-title">{{ title }}</h2>

    <div class="content-wrapper">
      <div v-if="isLoading" class="loading-overlay">
        <div class="spinner"></div>
        <p class="loading-text">시간대별 날씨를 불러오는 중...</p>
      </div>

      <p v-else-if="locationError" class="hourly-error-text">위치 권한이 거부되었거나 위치를 가져올 수 없습니다.</p>
      <p v-else-if="weatherError" class="hourly-error-text">날씨정보를 불러올 수 없습니다.</p>

      <div v-else-if="hourlyForecast.length" ref="chartWrapRef" class="chart-wrap">
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
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import { getUltraSrtFcst, getVilageFcst } from "../composables/useWeather";
import { getFcstBaseTime, getVilageFcstBaseDateTime } from "../utils/timeConvert";

const props = withDefaults(
  defineProps<{
    lat: number;
    lng: number;
    title?: string;
  }>(),
  {
    title: "시간대별 날씨",
  }
);

const isLoading = ref(false);
const locationError = ref(false);
const weatherError = ref(false);
const hourlyForecast = ref<Array<{ time: string; sky: string; temp: string }>>([]);

const hasValidCoords = (lat: number, lng: number) => typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0;

const getWeatherIcon = (sky?: string) => {
  if (sky === "1") return "icon-sunny";
  if (sky === "3") return "icon-suncloudy";
  if (sky === "4") return "icon-cloudy";
  return "unknown";
};

const CHART_PAD = 12;
const CHART_H = 100;
const chartWrapRef = ref<HTMLElement | null>(null);
const containerChartWidth = ref(340);
let resizeObserver: ResizeObserver | null = null;

function updateChartWidth() {
  if (!chartWrapRef.value) return;
  const padding = 32;
  containerChartWidth.value = Math.max(300, chartWrapRef.value.clientWidth - padding);
}

const lineChartWidth = computed(() => containerChartWidth.value);

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

const hourlyTempRange = computed(() => {
  const temps = hourlyForecast.value.map((s) => (s.temp !== "-" ? Number(s.temp) : null)).filter((n): n is number => n !== null);
  if (temps.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const padding = max === min ? 2 : 0;
  return { min: min - padding, max: max + padding };
});

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
const lineChartPoints = computed(() => lineChartCoords.value.map((p) => `${p.x},${p.y}`).join(" "));

const fetchHourlyWeather = async (lat: number, lng: number) => {
  if (!hasValidCoords(lat, lng)) {
    hourlyForecast.value = [];
    return;
  }

  isLoading.value = true;
  weatherError.value = false;
  hourlyForecast.value = [];

  try {
    const { fctBaseDate, fctBaseTime } = getFcstBaseTime();
    const fcstData = await getUltraSrtFcst(lat, lng, fctBaseDate, fctBaseTime);
    const fcstItems = fcstData?.response?.body?.items?.item ?? [];

    let vilageItems: Array<{ category: string; fcstDate: string; fcstTime: string; fcstValue: string }> = [];
    try {
      const { baseDate: vDate, baseTime: vTime } = getVilageFcstBaseDateTime();
      const vilageRes = await getVilageFcst(lat, lng, vDate, vTime);
      if (vilageRes?.response?.body?.items?.item) {
        vilageItems = vilageRes.response.body.items.item;
      }
    } catch {
      const byTime = new Map<string, { sky: string; t1h: string }>();
      (fcstItems as Array<{ category: string; fcstDate: string; fcstTime: string; fcstValue: string }>).forEach((item) => {
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

    const byTimeVilage = new Map<string, { dateStr: string; timeStr: string; sky: string; tmp: string }>();
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

    entries.sort((a, b) => a.dt.getTime() - b.dt.getTime());
    hourlyForecast.value = entries
      .filter((e) => e.dt.getMinutes() === 0 && e.dt.getHours() % 3 === 0)
      .map((e) => {
        const hh = String(e.dt.getHours()).padStart(2, "0");
        const mm = String(e.dt.getMinutes()).padStart(2, "0");
        return { time: `${hh}:${mm}`, sky: e.sky, temp: e.tmp };
      });
  } catch {
    hourlyForecast.value = [];
  } finally {
    isLoading.value = false;
    if (hasValidCoords(lat, lng)) {
      weatherError.value = hourlyForecast.value.length === 0;
    }
  }
};

watch(
  () => [props.lat, props.lng] as const,
  ([lat, lng]) => {
    if (!hasValidCoords(lat, lng)) {
      locationError.value = true;
      weatherError.value = false;
      hourlyForecast.value = [];
      isLoading.value = false;
      return;
    }
    locationError.value = false;
    fetchHourlyWeather(lat, lng);
  },
  { immediate: true }
);
</script>

<style scoped>
.hourly-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 700;
  color: #17446d;
}

.content-wrapper {
  position: relative;
  min-height: 220px;
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
  border-radius: 16px;
  z-index: 10;
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

.loading-text {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #4c6f8f;
}

.hourly-error-text {
  margin: 0;
  padding: 20px 16px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  font-weight: 600;
  color: #6b7280;
  text-align: center;
  background: #ffffffd9;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(29, 76, 122, 0.12);
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

.hourly-icon.icon-suncloudy {
  background: url("@/assets/images/icon-suncloudy.png") no-repeat center center / contain;
}

.hourly-temp {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #254f75;
}
</style>
