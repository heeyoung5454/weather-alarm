<template>
  <div class="alarm-item">
    <div class="alarm-row">
      <button type="button" class="summary-panel" @click="goToEdit">
        <div class="summary-head">
          <span class="time-wrap">
            <span class="time-icon" aria-hidden="true"></span>
            <span class="time-value">{{ alarm.time }}</span>
          </span>
          <span class="panel-chevron" aria-hidden="true">›</span>
        </div>

        <div class="summary-block">
          <div class="weekday-chips">
            <span v-for="day in ALL_WEEKDAYS" :key="day" class="weekday-pill" :class="{ on: isWeekdayOn(alarm, day) }">
              {{ WEEKDAY_LABELS[day] }}
            </span>
          </div>
        </div>

        <div class="summary-block region-line">
          <span class="region-name">{{ alarm.region }}</span>
        </div>
      </button>

      <div class="alarm-side">
        <label class="switch" @click.stop>
          <input type="checkbox" v-model="alarm.enabled" @change="emit('persist', alarm)" />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <div class="alarm-footer">
      <button class="delete-btn" type="button" @click="emit('remove', alarm.id)">삭제</button>
    </div>
  </div>
</template>

<script setup lang="ts">
/** 0=일 … 6=토 (Date.getDay()와 동일, 스케줄러와 맞춤) */
const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const props = defineProps<{
  alarm: any;
}>();

const emit = defineEmits<{
  remove: [id: string];
  persist: [alarm: any];
}>();

// @ts-ignore - Nuxt auto-import
const router = useRouter();

const goToEdit = () => {
  if (!props.alarm?.id) return;
  router.push(`/alarm/edit/${props.alarm.id}`);
};

const normalizeWeekdays = (raw: unknown): number[] => {
  if (!Array.isArray(raw) || raw.length === 0) return [...ALL_WEEKDAYS];
  const nums = raw.filter((x): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 6);
  if (nums.length === 0) return [...ALL_WEEKDAYS];
  return Array.from(new Set(nums)).sort((a, b) => a - b);
};

const isWeekdayOn = (alarm: any, day: number) => {
  const w = normalizeWeekdays(alarm.weekdays);
  return w.includes(day);
};
</script>

<style scoped>
.alarm-item {
  border-bottom: 1px solid #d8e7f3;
  padding: 16px 0 14px;
}

.alarm-row {
  display: flex;
  align-items: stretch;
  gap: 12px;
}

.summary-panel {
  flex: 1;
  min-width: 0;
  display: block;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid #d8e7f3;
  background: linear-gradient(180deg, #f8fbff 0%, #f0f6fc 100%);
  text-align: left;
  cursor: pointer;
  transition:
    box-shadow 0.2s,
    border-color 0.2s;
}

.summary-panel:hover {
  border-color: #b8d4ec;
  box-shadow: 0 4px 14px rgba(29, 76, 122, 0.1);
}

.summary-panel:active {
  transform: translateY(0.5px);
}

.summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.time-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.time-icon {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 2px solid #5a6d7e;
  position: relative;
  flex-shrink: 0;
  opacity: 0.85;
}

.time-icon::before,
.time-icon::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: bottom center;
  background: #5a6d7e;
}

.time-icon::before {
  width: 2px;
  height: 6px;
  transform: translate(-50%, -90%);
}

.time-icon::after {
  width: 2px;
  height: 4px;
  transform: translate(-10%, -50%) rotate(90deg);
}

.time-value {
  font-size: 26px;
  font-weight: 700;
  color: #17446d;
  letter-spacing: -0.02em;
}

.panel-chevron {
  flex-shrink: 0;
  font-size: 22px;
  font-weight: 300;
  color: #8aa3b8;
  line-height: 1;
}

.summary-block {
  margin-top: 8px;
}

.summary-block:first-of-type {
  margin-top: 0;
}

.region-line {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #d0e3f2;
}

.weekday-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.weekday-pill {
  padding: 2px;
  font-size: 11px;
  font-weight: 700;
  color: #9aa8b5;
  text-align: center;
}

.weekday-pill.on {
  color: #17446d;
}

.region-name {
  font-size: 14px;
  font-weight: 700;
  color: #3d5a73;
}

.alarm-side {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  padding-top: 4px;
}

.side-label {
  font-size: 11px;
  font-weight: 800;
  color: #6b8399;
}

.alarm-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.delete-btn {
  background: none;
  border: none;
  padding: 4px 2px;
  font-size: 13px;
  font-weight: 700;
  color: #ff3b30;
  cursor: pointer;
  opacity: 0.9;
}

.delete-btn:hover {
  opacity: 1;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
}

.switch input {
  opacity: 0;
}

.slider {
  position: absolute;
  inset: 0;
  background: #ccc;
  border-radius: 34px;
}

.slider:before {
  content: "";
  position: absolute;
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.2s;
}

input:checked + .slider {
  background: #34c759;
}

input:checked + .slider:before {
  transform: translateX(22px);
}
</style>
