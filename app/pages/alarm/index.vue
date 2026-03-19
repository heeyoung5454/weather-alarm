<template>
  <main class="alarm-page">
    <div class="alarm-shell">
      <header class="page-top-line">
        <NuxtLink to="/" class="home-link" aria-label="홈으로 이동">
          <svg class="home-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6a2 2 0 0 0-2-2H11a2 2 0 0 0-2 2v6H4a1 1 0 0 1-1-1V10.5Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </svg>
        </NuxtLink>
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
  gap: 10px;
  padding: 8px 0 14px;
  border-bottom: 1px solid rgba(23, 68, 109, 0.18);
  margin-bottom: 14px;
}

.home-link {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #17446d;
  background: #ffffffd9;
  box-shadow: 0 4px 10px rgba(29, 76, 122, 0.12);
}

.home-icon {
  width: 20px;
  height: 20px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #17446d;
}

@media (max-width: 768px) {
  .alarm-page {
    padding: 16px;
  }
}
</style>
