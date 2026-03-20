<template>
  <main class="page">
    <div class="account-header">
      <button type="button" class="home-nav-btn" @click="router.push('/')">
        <svg class="home-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6a2 2 0 0 0-2-2H11a2 2 0 0 0-2 2v6H4a1 1 0 0 1-1-1V10.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
    <div class="card">
      <h1 class="title">계정</h1>

      <div v-if="isLoggedIn === true" class="content">
        <p class="row">
          <span class="label">이메일</span>
          <span class="value">{{ userEmail }}</span>
        </p>
        <p class="row">
          <span class="label">이름</span>
          <span class="value">{{ userName }}</span>
        </p>

        <button type="button" class="logout-btn" :disabled="logoutLoading" @click="handleLogout">
          로그아웃
        </button>
      </div>

      <div v-else-if="isLoggedIn === false" class="content">
        <p class="hint">로그인이 필요합니다.</p>
        <button type="button" class="back-btn" :disabled="logoutLoading" @click="router.push('/')">
          홈으로
        </button>
      </div>

      <div v-else class="content">
        <p class="hint">계정 정보를 불러오는 중...</p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

// @ts-ignore - Nuxt auto-import
const router = useRouter();

const { $auth, $db } = useNuxtApp();

const isLoggedIn = ref<boolean | null>(null);
const userEmail = ref("");
const userName = ref("");
const logoutLoading = ref(false);

const handleLogout = async () => {
  try {
    logoutLoading.value = true;
    await signOut($auth);
    router.push("/");
  } finally {
    logoutLoading.value = false;
  }
};

onMounted(() => {
  onAuthStateChanged($auth, async (user) => {
    if (!user) {
      isLoggedIn.value = false;
      userEmail.value = "";
      userName.value = "";
      return;
    }

    isLoggedIn.value = true;
    userEmail.value = user.email ?? "";

    // Firestore `users` 문서의 name을 우선 사용
    try {
      const refDoc = doc($db, "users", user.uid);
      const snap = await getDoc(refDoc);
      if (snap.exists()) {
        const data: any = snap.data();
        userName.value = data?.name ?? user.displayName ?? "";
      } else {
        userName.value = user.displayName ?? "";
      }
    } catch {
      userName.value = user.displayName ?? "";
    }
  });
});
</script>

<style scoped>
.page {
  min-height: calc(100vh - 156px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #8ed0ff 0%, #d9f0ff 50%, #f6fbff 100%);
  padding: 24px;
  box-sizing: border-box;
  position: relative;
}

.account-header {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 1000;
}

.home-nav-btn {
  padding: 10px 12px;
  border-radius: 999px;
  border: none;
  background: #edf2f6;
  color: #4b5b6a;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.home-nav-btn:hover {
  transform: translateY(-1px);
}

.home-icon {
  width: 18px;
  height: 18px;
}

.card {
  width: 100%;
  max-width: 480px;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  border-radius: 24px;
  box-shadow: 0 12px 30px rgba(29, 76, 122, 0.2);
  padding: 22px 18px;
}

.title {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 900;
  color: #17446d;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row {
  margin: 0;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 16px;
  background: #ffffffcc;
  border: 1px solid #d8e7f3;
}

.label {
  font-size: 13px;
  font-weight: 800;
  color: #17446d;
}

.value {
  font-size: 13px;
  font-weight: 700;
  color: #4b5b6a;
  text-align: right;
  word-break: break-word;
}

.hint {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #4c6f8f;
}

.logout-btn {
  margin-top: 6px;
  padding: 12px 14px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #2c83c9 0%, #17446d 100%);
  color: white;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 14px rgba(44, 131, 201, 0.4);
}

.logout-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(44, 131, 201, 0.5);
}

.logout-btn:active:not(:disabled) {
  transform: translateY(0);
}

.logout-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.back-btn {
  padding: 12px 14px;
  border-radius: 999px;
  border: none;
  background: #edf2f6;
  color: #4b5b6a;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
}

.back-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
