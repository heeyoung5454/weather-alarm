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

      <div v-else-if="hourlyForecast.length" class="chart-wrap">
        <div class="line-chart" :style="{ width: lineChartWidth + 'px', minWidth: lineChartWidth + 'px' }">
          <svg class="chart-svg" :viewBox="lineChartViewBox" preserveAspectRatio="none">
            <polyline v-if="lineChartPoints" class="chart-line" vector-effect="non-scaling-stroke" :points="lineChartPoints" fill="none" />
            <text v-for="(pt, i) in lineChartCoords" :key="'t-' + i" class="chart-value-text" vector-effect="non-scaling-stroke" :x="pt.x" :y="pt.labelY" text-anchor="middle">
              {{ pt.label }}
            </text>
            <circle v-for="(pt, i) in lineChartCoords" :key="i" class="chart-dot" vector-effect="non-scaling-stroke" :cx="pt.x" :cy="pt.y" r="3" />
          </svg>
        </div>
        <div class="chart-labels" :style="{ width: lineChartWidth + 'px', minWidth: lineChartWidth + 'px' }">
          <article v-for="(slot, hi) in hourlyForecast" :key="`${hi}-${slot.time}`" class="hourly-slot">
            <p class="hourly-time">{{ slot.time }}</p>
            <div class="hourly-icon" :class="getWeatherIcon(slot.sky, slot.pop)" aria-hidden="true"></div>
            <div class="hourly-slot-values">
              <p class="hourly-slot-pop">{{ formatPopLabel(slot.pop) }}</p>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
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
const hourlyForecast = ref<Array<{ time: string; sky: string; temp: string; pop: string }>>([]);

const hasValidCoords = (lat: number, lng: number) => typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0;

/** 강수확률(%) 이상이면 하늘상태와 무관하게 비 아이콘 */
const POP_ICON_RAINY_MIN = 60;

const getWeatherIcon = (sky?: string, pop?: string) => {
  const p = parsePopNum(pop ?? "-");
  if (p !== null && p >= POP_ICON_RAINY_MIN) return "icon-rainy";
  if (sky === "1") return "icon-sunny";
  if (sky === "3") return "icon-suncloudy";
  if (sky === "4") return "icon-cloudy";
  return "unknown";
};

const FORECAST_HOURS = 24;

function normalizeFcstTime(t: string): string {
  return String(t).padStart(4, "0");
}

function fcstKeyToDate(key: string): Date {
  const [ds, rawT] = key.split("_");
  const tt = normalizeFcstTime(rawT);
  const y = Number(ds.slice(0, 4));
  const mo = Number(ds.slice(4, 6)) - 1;
  const d = Number(ds.slice(6, 8));
  const hh = Number(tt.slice(0, 2));
  const mm = Number(tt.slice(2, 4));
  return new Date(y, mo, d, hh, mm);
}

function dateToFcstKey(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const h = String(dt.getHours()).padStart(2, "0");
  return `${y}${m}${d}_${h}00`;
}

function formatHHMM(dt: Date): string {
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

function parseTmpNum(s: string): number | null {
  if (s === "-" || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** 단기/초단기 강수확률(%) */
function parsePopNum(s: string): number | null {
  if (s === "-" || s === "") return null;
  const n = parseInt(String(s).trim(), 10);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

function formatPopLabel(pop: string): string {
  const n = parsePopNum(pop);
  return n !== null ? `${n}%` : "—";
}

function buildUltraMap(fcstItems: Array<{ category: string; fcstDate: string; fcstTime: string; fcstValue: string }>) {
  const byTime = new Map<string, { sky: string; t1h: string; pop: string }>();
  fcstItems.forEach((item) => {
    const key = `${item.fcstDate}_${normalizeFcstTime(item.fcstTime)}`;
    if (!byTime.has(key)) byTime.set(key, { sky: "1", t1h: "-", pop: "-" });
    const cur = byTime.get(key)!;
    if (item.category === "SKY") cur.sky = item.fcstValue;
    if (item.category === "T1H") cur.t1h = item.fcstValue;
    if (item.category === "POP") cur.pop = item.fcstValue;
  });
  return byTime;
}

type VilageSlot = { dateStr: string; timeStr: string; sky: string; tmp: string; pop: string };

function interpolatedScalar(slot: Date, points: Array<{ dt: Date; n: number }>): number | null {
  if (points.length === 0) return null;
  const prev = points.filter((p) => p.dt.getTime() <= slot.getTime()).pop();
  const next = points.find((p) => p.dt.getTime() >= slot.getTime());
  if (prev && next && prev.dt.getTime() < slot.getTime() && next.dt.getTime() > slot.getTime()) {
    const r = (slot.getTime() - prev.dt.getTime()) / (next.dt.getTime() - prev.dt.getTime());
    return Math.round(prev.n + r * (next.n - prev.n));
  }
  if (prev && prev.dt.getTime() <= slot.getTime()) return Math.round(prev.n);
  if (next) return Math.round(next.n);
  return null;
}

/**
 * 단기(3h)·초단기(1h) 병합 후 24시간 1시간 간격. 비어 있는 시각은 인접 예보 온도·강수확률 선형 보간, 하늘은 가까운 시각 값 사용.
 */
function mergeHourlyForecast(start: Date, ultraByTime: Map<string, { sky: string; t1h: string; pop: string }>, byTimeVilage: Map<string, VilageSlot>) {
  const windowEnd = new Date(start.getTime() + FORECAST_HOURS * 60 * 60 * 1000);

  const merged = new Map<string, { sky: string; temp: string; pop: string }>();

  byTimeVilage.forEach((v) => {
    const fullKey = `${v.dateStr}_${normalizeFcstTime(v.timeStr)}`;
    const dt = fcstKeyToDate(fullKey);
    if (dt < start || dt >= windowEnd) return;
    merged.set(fullKey, { sky: v.sky, temp: v.tmp, pop: v.pop });
  });

  ultraByTime.forEach((u, key) => {
    const fullKey = key;
    const dt = fcstKeyToDate(fullKey);
    if (dt < start || dt >= windowEnd) return;
    const ex = merged.get(fullKey);
    merged.set(fullKey, {
      sky: u.sky,
      temp: u.t1h !== "-" ? u.t1h : (ex?.temp ?? "-"),
      pop: u.pop !== "-" ? u.pop : (ex?.pop ?? "-"),
    });
  });

  const numericPoints = Array.from(merged.entries())
    .map(([k, v]) => {
      const n = parseTmpNum(v.temp);
      return { k, dt: fcstKeyToDate(k), sky: v.sky, temp: v.temp, n };
    })
    .filter((p): p is typeof p & { n: number } => p.n !== null)
    .sort((a, b) => a.dt.getTime() - b.dt.getTime());

  const popPoints = Array.from(merged.entries())
    .map(([k, v]) => ({ dt: fcstKeyToDate(k), n: parsePopNum(v.pop) }))
    .filter((p): p is { dt: Date; n: number } => p.n !== null)
    .sort((a, b) => a.dt.getTime() - b.dt.getTime());

  let slot0 = new Date(start);
  slot0.setMinutes(0, 0, 0);
  if (slot0.getTime() < start.getTime()) slot0.setHours(slot0.getHours() + 1);

  const out: Array<{ time: string; sky: string; temp: string; pop: string }> = [];

  for (let i = 0; i < FORECAST_HOURS; i++) {
    const slot = new Date(slot0.getTime() + i * 60 * 60 * 1000);
    if (slot >= windowEnd) break;

    const slotKey = dateToFcstKey(slot);
    const hit = merged.get(slotKey);

    let tempStr = "-";
    let skyStr = "1";
    let popStr = "-";

    if (hit && parseTmpNum(hit.temp) !== null) {
      tempStr = hit.temp;
      skyStr = hit.sky;
      const directPop = parsePopNum(hit.pop);
      if (directPop !== null) popStr = String(directPop);
      else {
        const ip = interpolatedScalar(slot, popPoints);
        if (ip !== null) popStr = String(ip);
      }
    } else {
      const prev = numericPoints.filter((p) => p.dt.getTime() <= slot.getTime()).pop();
      const next = numericPoints.find((p) => p.dt.getTime() >= slot.getTime());

      if (prev && next && prev.dt.getTime() < slot.getTime() && next.dt.getTime() > slot.getTime()) {
        const r = (slot.getTime() - prev.dt.getTime()) / (next.dt.getTime() - prev.dt.getTime());
        tempStr = String(Math.round(prev.n + r * (next.n - prev.n)));
        skyStr = r < 0.5 ? prev.sky : next.sky;
      } else if (prev && prev.dt.getTime() <= slot.getTime()) {
        tempStr = String(Math.round(prev.n));
        skyStr = prev.sky;
      } else if (next) {
        tempStr = String(Math.round(next.n));
        skyStr = next.sky;
      }

      const ip = interpolatedScalar(slot, popPoints);
      if (ip !== null) popStr = String(ip);
    }

    out.push({ time: formatHHMM(slot), sky: skyStr, temp: tempStr, pop: popStr });
  }

  return out;
}

const CHART_PAD = 12;
/** 그래프 선이 그려지는 세로 구간 (라벨 영역 제외) */
const CHART_DRAW_H = 100;
/** 선 위 온도 숫자용 상단 여백 */
const CHART_LABEL_TOP = 16;
const CHART_H = CHART_LABEL_TOP + CHART_DRAW_H;
/** Y축 최소 구간(°C) — 좁은 변화폭도 완만하게 보이도록 */
const CHART_MIN_TEMP_SPAN = 7;
/** 라벨 열 너비 — 그래프 가로 스케일과 동일 */
const HOURLY_SLOT_PX = 44;

const lineChartWidth = computed(() => hourlyForecast.value.length * HOURLY_SLOT_PX);

const hourlyTempRange = computed(() => {
  const temps = hourlyForecast.value.map((s) => (s.temp !== "-" ? Number(s.temp) : null)).filter((n): n is number => n !== null);
  if (temps.length === 0) return { min: 0, max: 1 };
  const dataMin = Math.min(...temps);
  const dataMax = Math.max(...temps);
  const span = dataMax - dataMin;
  if (span === 0) {
    const pad = 2;
    return { min: dataMin - pad, max: dataMax + pad };
  }
  const extra = Math.max(0, (CHART_MIN_TEMP_SPAN - span) / 2);
  const ratioPad = span * 0.12;
  const pad = Math.max(extra, ratioPad, 0.5);
  return { min: dataMin - pad, max: dataMax + pad };
});

const lineChartCoords = computed(() => {
  const list = hourlyForecast.value;
  const { min, max } = hourlyTempRange.value;
  const range = max - min || 1;
  const innerH = CHART_DRAW_H - CHART_PAD * 2;
  if (list.length === 0) return [];
  const colWidth = HOURLY_SLOT_PX;
  return list.map((slot, i) => {
    const x = (i + 0.5) * colWidth;
    const hasTemp = slot.temp !== "-";
    const temp = hasTemp ? Number(slot.temp) : min;
    const ratio = (temp - min) / range;
    const y = CHART_LABEL_TOP + CHART_DRAW_H - CHART_PAD - ratio * innerH;
    const label = hasTemp ? String(Math.round(Number(slot.temp))) + "°" : "—";
    const labelY = y - 8;
    return { x, y, label, labelY };
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
    const fcstData = await getUltraSrtFcst(lat, lng, fctBaseDate, fctBaseTime, { numOfRows: 500 });
    const rawItems = fcstData?.response?.body?.items?.item ?? [];
    const fcstItems = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
    const ultraByTime = buildUltraMap(fcstItems as Array<{ category: string; fcstDate: string; fcstTime: string; fcstValue: string }>);
    const start = new Date();

    let vilageItems: Array<{ category: string; fcstDate: string; fcstTime: string; fcstValue: string }> = [];
    try {
      const { baseDate: vDate, baseTime: vTime } = getVilageFcstBaseDateTime();
      const vilageRes = await getVilageFcst(lat, lng, vDate, vTime);
      if (vilageRes?.response?.body?.items?.item) {
        const v = vilageRes.response.body.items.item;
        vilageItems = Array.isArray(v) ? v : [v];
      }
    } catch {
      const windowEnd = new Date(start.getTime() + FORECAST_HOURS * 60 * 60 * 1000);
      const sortedKeys = Array.from(ultraByTime.keys())
        .sort()
        .filter((key) => {
          const dt = fcstKeyToDate(key);
          return dt >= start && dt < windowEnd;
        });
      hourlyForecast.value = sortedKeys.map((key) => {
        const dt = fcstKeyToDate(key);
        const u = ultraByTime.get(key)!;
        return {
          time: formatHHMM(dt),
          sky: u.sky,
          temp: u.t1h,
          pop: u.pop !== "-" ? u.pop : "-",
        };
      });
      return;
    }

    const byTimeVilage = new Map<string, VilageSlot>();
    vilageItems.forEach((item) => {
      const key = `${item.fcstDate}_${item.fcstTime}`;
      const timeStr = item.fcstTime.padStart(4, "0");
      if (!byTimeVilage.has(key)) {
        byTimeVilage.set(key, {
          dateStr: item.fcstDate,
          timeStr,
          sky: "1",
          tmp: "-",
          pop: "-",
        });
      }
      const cur = byTimeVilage.get(key)!;
      if (item.category === "SKY") cur.sky = item.fcstValue;
      if (item.category === "TMP") cur.tmp = item.fcstValue;
      if (item.category === "POP") cur.pop = item.fcstValue;
    });

    hourlyForecast.value = mergeHourlyForecast(start, ultraByTime, byTimeVilage);
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

.chart-value-text {
  fill: #1e5f96;
  font-size: 11px;
  font-weight: 700;
  paint-order: stroke fill;
  stroke: #fff;
  stroke-width: 3px;
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

.hourly-icon.icon-rainy {
  background: url("@/assets/images/icon-rainy.png") no-repeat center center / contain;
}

.hourly-slot-values {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 2.5em;
  justify-content: flex-start;
}

.hourly-slot-pop {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  color: #5b8ab8;
  line-height: 1.2;
}
</style>
