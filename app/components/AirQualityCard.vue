<template>
  <div class="air-quality-card">
    <p class="air-quality-head">{{ summary?.sido ?? "—" }}</p>
    <div v-if="loading" class="air-quality-loading">불러오는 중…</div>
    <p v-else-if="errorMessage" class="air-error">{{ errorMessage }}</p>
    <p v-else-if="showNoDataMessage" class="air-error">정보를 가져올 수 없습니다.</p>
    <div v-else-if="summary" class="air-quality-metrics">
      <div class="air-metric">
        <span class="air-label">미세먼지</span>
        <strong class="air-value">{{ summary.pm10 != null ? `${summary.pm10}` : "—" }}</strong>
        <span class="air-unit">㎍/㎥</span>
        <span v-if="summary.gradePm10" class="air-grade" :class="gradeClass(summary.pm10, 'pm10')">{{ summary.gradePm10 }}</span>
      </div>
      <div class="air-metric">
        <span class="air-label">초미세먼지</span>
        <strong class="air-value">{{ summary.pm25 != null ? `${summary.pm25}` : "—" }}</strong>
        <span class="air-unit">㎍/㎥</span>
        <span v-if="summary.gradePm25" class="air-grade" :class="gradeClass(summary.pm25, 'pm25')">{{ summary.gradePm25 }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { AirQualitySummary } from "../composables/useAirQuality";

const props = defineProps<{
  loading: boolean;
  errorMessage: string;
  summary: AirQualitySummary | null;
}>();

/** 요약 없음, 또는 미세·초미세 수치가 모두 없을 때 */
const showNoDataMessage = computed(() => {
  if (props.loading || props.errorMessage) return false;
  if (!props.summary) return true;
  return props.summary.pm10 == null && props.summary.pm25 == null;
});

const gradeClass = (v: number | null, kind: "pm10" | "pm25") => {
  if (v == null) return "";
  const good = kind === "pm10" ? v <= 30 : v <= 15;
  const mid = kind === "pm10" ? v <= 80 : v <= 35;
  const bad = kind === "pm10" ? v <= 150 : v <= 75;
  if (good) return "g-good";
  if (mid) return "g-mid";
  if (bad) return "g-bad";
  return "g-verybad";
};
</script>

<style scoped>
.air-quality-card {
  width: 100%;
  padding: 16px 18px;
  border-radius: 20px;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  box-shadow: 0 8px 22px rgba(29, 76, 122, 0.12);
  box-sizing: border-box;
}

.air-quality-head {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 800;
  color: #17446d;
}

.air-quality-loading {
  margin: 0;
  font-size: 13px;
  color: #6b8399;
}

.air-quality-metrics {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.air-metric {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
}

.air-label {
  font-size: 13px;
  font-weight: 700;
  color: #6b8399;
  min-width: 110px;
}

.air-value {
  font-size: 28px;
  font-weight: 800;
  color: #17446d;
  letter-spacing: -0.02em;
}

.air-unit {
  font-size: 12px;
  font-weight: 600;
  color: #8aa3b8;
}

.air-grade {
  margin-left: auto;
  font-size: 12px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
}

.air-grade.g-good {
  background: #d9f0ff;
  color: #17446d;
}

.air-grade.g-mid {
  background: #fff3d4;
  color: #7a5a00;
}

.air-grade.g-bad {
  background: #ffe4d4;
  color: #a14a00;
}

.air-grade.g-verybad {
  background: #ffd9e0;
  color: #9aa3b8;
}

.air-error {
  margin: 0;
  font-size: 13px;
  color: #c45c5c;
}
</style>
