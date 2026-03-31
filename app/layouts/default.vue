<template>
  <div class="app-shell">
    <div class="app-shell-main">
      <slot />
      <AppFooter />
    </div>
    <nav class="tab-bar" aria-label="주요 메뉴">
      <div class="tab-bar-inner">
        <NuxtLink v-for="tab in tabs" :key="tab.to" :to="tab.to" class="tab-item" :class="{ active: isTabActive(tab.to) }">
          <span class="tab-icon" aria-hidden="true">
            <svg v-if="tab.icon === 'globe'" class="tab-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M2 12h20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path d="M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
            <svg v-else-if="tab.icon === 'home'" class="tab-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v6H4a1 1 0 0 1-1-1V10.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
            </svg>
            <svg v-else-if="tab.icon === 'bell'" class="tab-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 7-3 7h18s-3 0-3-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
            <svg v-else class="tab-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <span class="tab-label">{{ tab.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import AppFooter from "../components/AppFooter.vue";

// @ts-ignore - Nuxt auto-import
const route = useRoute();

const tabs = [
  { to: "/", label: "홈", icon: "home" as const },
  { to: "/alarm", label: "알림설정", icon: "bell" as const },
  { to: "/weather/nationalWeather", label: "전국날씨", icon: "globe" as const },
  { to: "/account", label: "계정", icon: "account" as const },
];

const isTabActive = (to: string) => {
  if (to === "/") return route.path === "/";
  return route.path === to || route.path.startsWith(`${to}/`);
};
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.app-shell-main {
  flex: 1;
  width: 100%;
  min-height: 0;
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
}

.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(23, 68, 109, 0.12);
  box-shadow: 0 -4px 20px rgba(29, 76, 122, 0.08);
}

.tab-bar-inner {
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  min-height: 64px;
}

.tab-item {
  flex: 1;
  max-width: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-decoration: none;
  color: #7d859e;
  font-size: 11px;
  font-weight: 700;
  border-top: 3px solid transparent;
  padding: 8px 6px 10px;
  box-sizing: border-box;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.tab-item:hover {
  color: #17446d;
  background: rgba(142, 208, 255, 0.15);
}

.tab-item.active {
  color: #17446d;
  border-top-color: #2c83c9;
  background: rgba(232, 244, 255, 0.6);
}

.tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tab-svg {
  width: 26px;
  height: 26px;
  display: block;
}

.tab-label {
  text-align: center;
  line-height: 1.2;
  max-width: 100%;
}
</style>
