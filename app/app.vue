<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- FCM Token 토글 버튼 -->
    <button v-if="fcmToken" @click="showToken = !showToken" class="token-toggle-button">
      {{ showToken ? '✕' : '🔧' }}
    </button>

    <!-- FCM Token 표시 (토글) -->
    <transition name="slide-up">
      <div v-if="fcmToken && showToken" class="fcm-token-container">
        <div class="token-header">
          <span class="token-label">FCM Token (개발자용)</span>
          <button @click="copyToken" class="copy-button">
            {{ copied ? '복사됨 ✓' : '복사' }}
          </button>
        </div>
        <div class="token-content">
          {{ fcmToken }}
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { usePush } from "./composables/usePush";

const fcmToken = ref("");
const copied = ref(false);
const showToken = ref(false);

const copyToken = async () => {
  try {
    await navigator.clipboard.writeText(fcmToken.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (error) {
    console.error("복사 실패:", error);
  }
};

onMounted(async () => {
  const token = await usePush();
  if (token) {
    fcmToken.value = token;
  }
});
</script>

<style scoped>
.token-toggle-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #17446dee;
  backdrop-filter: blur(8px);
  color: white;
  border: 2px solid #2c83c9;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.token-toggle-button:hover {
  background: #2c83c9;
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.token-toggle-button:active {
  transform: scale(0.95);
}

.fcm-token-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #17446dee;
  backdrop-filter: blur(8px);
  color: white;
  padding: 12px 16px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  font-family: monospace;
  font-size: 12px;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(100%);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

.token-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.token-label {
  font-weight: 700;
  font-size: 13px;
  color: #8ed0ff;
}

.copy-button {
  padding: 6px 12px;
  background: #2c83c9;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-button:hover {
  background: #3a9be0;
  transform: translateY(-1px);
}

.copy-button:active {
  transform: translateY(0);
}

.token-content {
  background: #0d2538;
  padding: 8px 10px;
  border-radius: 6px;
  word-break: break-all;
  line-height: 1.5;
  color: #8ed0ff;
  max-height: 80px;
  overflow-y: auto;
}

.token-content::-webkit-scrollbar {
  width: 6px;
}

.token-content::-webkit-scrollbar-thumb {
  background: #2c83c9;
  border-radius: 3px;
}

.token-content::-webkit-scrollbar-track {
  background: #17446d;
}

@media (max-width: 768px) {
  .token-toggle-button {
    width: 45px;
    height: 45px;
    bottom: 16px;
    right: 16px;
    font-size: 18px;
  }

  .fcm-token-container {
    padding: 10px 12px;
    font-size: 11px;
  }

  .token-label {
    font-size: 12px;
  }

  .copy-button {
    padding: 5px 10px;
    font-size: 11px;
  }
}
</style>
