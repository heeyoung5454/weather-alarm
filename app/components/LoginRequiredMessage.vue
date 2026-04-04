<template>
  <section class="login-required" aria-live="polite">
    <div class="login-required-inner">
      <p class="login-required-message">{{ message }}</p>
      <button v-if="showLoginButton" type="button" class="login-google-btn" :disabled="disabled || loginLoading" @click="openConsentModal">
        <span class="login-google-icon" aria-hidden="true">🔑</span>
        <span class="login-google-label">로그인</span>
      </button>
    </div>

    <ConfirmDialog :visible="isConsentModalOpen" title="동의 안내" :message="consentMessage" confirm-text="동의" cancel-text="취소" @confirm="confirmConsentAndLogin" @cancel="closeConsentModal" />
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import { useGoogleLogin } from "../composables/useGoogleLogin";

withDefaults(
  defineProps<{
    message?: string;
    showLoginButton?: boolean;
    /** 부모에서 버튼 비활성(예: 탈퇴 처리 중) */
    disabled?: boolean;
  }>(),
  {
    message: "로그인이 필요한 서비스 입니다.",
    showLoginButton: true,
    disabled: false,
  }
);

const consentMessage = `알림 서비스를 이용하기 위해 로그인이 필요합니다.

로그인 시 아래 정보를 수집합니다:
- 이메일 주소
- 이름
- 현재 위치 정보 (위도, 경도)
- 등록된 위치 정보 (위도, 경도)

수집된 정보는 알림 제공 및 서비스 운영에만 사용됩니다.
회원탈퇴 시 해당 정보는 파기됩니다.`;

const isConsentModalOpen = ref(false);
const loginLoading = ref(false);

const openConsentModal = () => {
  isConsentModalOpen.value = true;
};

const closeConsentModal = () => {
  isConsentModalOpen.value = false;
};

const confirmConsentAndLogin = async () => {
  closeConsentModal();
  try {
    loginLoading.value = true;
    await useGoogleLogin();
  } finally {
    loginLoading.value = false;
  }
};
</script>

<style scoped>
.login-required {
  width: 100%;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  border-radius: 24px;
  box-shadow: 0 12px 30px rgba(29, 76, 122, 0.2);
  box-sizing: border-box;
}

.login-required-inner {
  padding: 20px 18px 22px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  gap: 14px;
  min-height: calc(100dvh - 100px);
}

.login-required-message {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #17446d;
  text-align: center;
  line-height: 1.5;
}

.login-google-btn {
  align-self: center;
  width: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 18px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #2c83c9 0%, #17446d 100%);
  color: white;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(44, 131, 201, 0.4);
  cursor: pointer;
  transition: all 0.3s;
}

.login-google-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(44, 131, 201, 0.5);
}

.login-google-btn:active:not(:disabled) {
  transform: translateY(0);
}

.login-google-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-google-icon {
  font-size: 16px;
  line-height: 1;
}

.login-google-label {
  line-height: 1.2;
}
</style>
