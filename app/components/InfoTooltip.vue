<template>
  <span class="tooltip-wrap">
    <button type="button" class="help-btn" :aria-label="label">?</button>
    <span class="tooltip-text" :class="`is-${position}`">{{ text }}</span>
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    text: string;
    label?: string;
    position?:
      | "top-center"
      | "top-left"
      | "top-right"
      | "bottom-center"
      | "bottom-left"
      | "bottom-right";
  }>(),
  {
    label: "안내",
    position: "top-center",
  }
);
</script>

<style scoped>
.tooltip-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.help-btn {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 999px;
  background: #d9eaf8;
  color: #2c83c9;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.tooltip-text {
  position: absolute;
  background: #17446d;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 8px;
  border-radius: 8px;
  white-space: nowrap;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-2px);
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 20;
}

.tooltip-text.is-top-center {
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translate(-50%, 2px);
}

.tooltip-text.is-top-left {
  left: 0;
  bottom: calc(100% + 8px);
  transform: translateY(2px);
}

.tooltip-text.is-top-right {
  right: 0;
  bottom: calc(100% + 8px);
  transform: translateY(2px);
}

.tooltip-text.is-bottom-center {
  left: 50%;
  top: calc(100% + 8px);
  transform: translate(-50%, -2px);
}

.tooltip-text.is-bottom-left {
  left: 0;
  top: calc(100% + 8px);
  transform: translateY(-2px);
}

.tooltip-text.is-bottom-right {
  right: 0;
  top: calc(100% + 8px);
  transform: translateY(-2px);
}

.help-btn:hover + .tooltip-text,
.help-btn:focus-visible + .tooltip-text {
  opacity: 1;
}

.help-btn:hover + .tooltip-text.is-top-center,
.help-btn:focus-visible + .tooltip-text.is-top-center {
  transform: translate(-50%, 0);
}

.help-btn:hover + .tooltip-text.is-top-left,
.help-btn:focus-visible + .tooltip-text.is-top-left,
.help-btn:hover + .tooltip-text.is-top-right,
.help-btn:focus-visible + .tooltip-text.is-top-right {
  transform: translateY(0);
}

.help-btn:hover + .tooltip-text.is-bottom-center,
.help-btn:focus-visible + .tooltip-text.is-bottom-center {
  transform: translate(-50%, 0);
}

.help-btn:hover + .tooltip-text.is-bottom-left,
.help-btn:focus-visible + .tooltip-text.is-bottom-left,
.help-btn:hover + .tooltip-text.is-bottom-right,
.help-btn:focus-visible + .tooltip-text.is-bottom-right {
  transform: translateY(0);
}
</style>
