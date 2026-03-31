<template>
  <div v-if="open" class="region-popup-backdrop" role="dialog" aria-label="내 지역 선택" @click.self="$emit('close')">
    <div class="region-popup">
      <div class="region-popup-head">
        <p class="region-popup-title">{{ title }}</p>
        <button type="button" class="region-popup-close" aria-label="닫기" @click="$emit('close')">✕</button>
      </div>

      <div class="region-popup-list" role="list">
        <button
          v-for="opt in options"
          :key="opt.key"
          type="button"
          class="region-popup-item"
          :class="{ active: opt.key === value }"
          role="listitem"
          @click="$emit('select', opt.key)"
        >
          <span class="region-popup-label">{{ opt.label }}</span>
          <span v-if="opt.key === value" class="region-popup-check" aria-hidden="true">✓</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    options: { key: string; label: string }[];
    value: string;
  }>(),
  {
    title: "내 지역",
  },
);

defineEmits<{
  (e: "close"): void;
  (e: "select", key: string): void;
}>();
</script>

<style scoped>
.region-popup-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(6px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  box-sizing: border-box;
}

.region-popup {
  width: 100%;
  max-width: 360px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(23, 68, 109, 0.12);
  border-radius: 18px;
  box-shadow: 0 16px 40px rgba(29, 76, 122, 0.18);
  overflow: hidden;
}

.region-popup-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 14px 10px;
  border-bottom: 1px solid rgba(23, 68, 109, 0.12);
}

.region-popup-title {
  margin: 0;
  font-size: 14px;
  font-weight: 900;
  color: #17446d;
}

.region-popup-close {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #4b5b6a;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
  transition: background 0.15s ease;
}

.region-popup-close:hover {
  background: rgba(0, 0, 0, 0.06);
}

.region-popup-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 12px 14px;
  max-height: 280px;
  overflow: auto;
}

.region-popup-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(216, 231, 243, 0.9);
  background: rgba(255, 255, 255, 0.92);
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  color: #17446d;
  font-weight: 800;
}

.region-popup-item.active {
  border-color: rgba(44, 131, 201, 0.55);
  background: rgba(232, 244, 255, 0.8);
}

.region-popup-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.region-popup-check {
  flex: 0 0 auto;
  color: #2c83c9;
  font-weight: 900;
}
</style>

