<template>
  <main class="alarm-page">
    <div class="page-content">
      <AlarmSetting />
    </div>
  </main>
</template>

<script setup lang="ts">
// @ts-ignore - Vue SFC with script setup
import AlarmSetting from "./components/AlarmSetting.vue";
</script>

<style scoped>
.alarm-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #8ed0ff 0%, #d9f0ff 50%, #f6fbff 100%);
  padding: 24px;
  box-sizing: border-box;
}

.page-content {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (max-width: 768px) {
  .alarm-page {
    padding: 16px;
  }
}
</style>
