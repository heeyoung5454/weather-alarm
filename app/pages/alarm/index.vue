<template>
  <main class="alarm-page">
    <div class="alarm-shell">
      <header class="page-top-line">
        <h1 class="page-title">알림 설정</h1>
      </header>

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

.alarm-shell {
  max-width: 480px;
  margin: 0 auto;
}

.page-top-line {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  max-width: 420px;
  margin: 0 auto 14px;
  padding: 8px 0 14px;
  border-bottom: 1px solid rgba(23, 68, 109, 0.18);
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #17446d;
  text-align: center;
}

@media (max-width: 768px) {
  .alarm-page {
    padding: 16px;
  }
}
</style>
