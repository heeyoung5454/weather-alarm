<template>
  <transition name="toast-fade">
    <div v-if="visible" class="toast-container">
      <p class="toast-text">{{ message }}</p>
    </div>
  </transition>
</template>

<script setup lang="ts">
const props = defineProps<{
  message: string;
  visible: boolean;
}>();
</script>

<style scoped>
.toast-container {
  position: fixed;
  left: 50%;
  bottom: 32px;
  transform: translateX(-50%);
  width: auto;
  max-width: calc(100% - 40px);
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(33, 37, 41, 0.95);
  color: #fff;
  font-size: 14px;
  text-align: center;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  z-index: 2000;
}

.toast-text {
  margin: 0;
  white-space: pre-line;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}
</style>

