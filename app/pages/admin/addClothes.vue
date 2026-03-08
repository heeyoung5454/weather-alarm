<template>
  <main class="admin-page">
    <div class="admin-container">
      <header class="page-header">
        <h1 class="page-title">의류 정보 입력</h1>
        <NuxtLink to="/admin" class="back-link">← 메인으로</NuxtLink>
      </header>

      <form class="data-form" @submit.prevent="addSample">
        <div class="form-group">
          <label for="temperature" class="form-label">기온 (°C)</label>
          <input id="temperature" v-model.number="temperature" type="number" class="form-input" placeholder="예: 25" required />
        </div>

        <div class="form-group">
          <label for="category" class="form-label">분류</label>
          <select id="category" v-model="category" class="form-select" required>
            <option value="" disabled>분류를 선택하세요</option>
            <option value="상의">상의</option>
            <option value="하의">하의</option>
            <option value="원피스">원피스</option>
            <option value="바지">바지</option>
            <option value="스커트">스커트</option>
            <option value="아우터">아우터</option>
            <option value="슈즈">슈즈</option>
          </select>
        </div>

        <div class="form-group">
          <label for="clothesName" class="form-label">이름</label>
          <input id="clothesName" v-model="clothesName" type="text" class="form-input" placeholder="예: 반팔 티셔츠" required />
        </div>

        <div class="form-group">
          <label for="matchingCode" class="form-label">매칭코드</label>
          <input id="matchingCode" v-model="matchingCode" type="text" class="form-input" placeholder="예: TOP001" required />
          <p class="field-hint">옷 조합 매칭 시 사용할 고유 코드</p>
        </div>

        <div class="form-group">
          <label for="imageUrl" class="form-label">사진 URL</label>
          <input id="imageUrl" v-model="imageUrl" type="url" class="form-input" placeholder="https://example.com/image.jpg" required />
        </div>

        <button type="submit" class="submit-button" :disabled="isSubmitting">
          {{ isSubmitting ? "저장 중..." : "데이터 저장" }}
        </button>

        <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      </form>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { collection, addDoc } from "firebase/firestore";

// @ts-ignore - Nuxt auto-import
const { $db } = useNuxtApp();

const temperature = ref<number | null>(null);
const category = ref("");
const clothesName = ref("");
const matchingCode = ref("");
const imageUrl = ref("");
const isSubmitting = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

const addSample = async () => {
  isSubmitting.value = true;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    await addDoc(collection($db, "clothes"), {
      temperature: temperature.value,
      category: category.value,
      clothesName: clothesName.value,
      matchingCode: matchingCode.value,
      imageUrl: imageUrl.value,
      createdAt: new Date(),
    });

    successMessage.value = "데이터가 성공적으로 저장되었습니다!";

    // 입력 초기화
    temperature.value = null;
    category.value = "";
    clothesName.value = "";
    matchingCode.value = "";
    imageUrl.value = "";

    // 성공 메시지 3초 후 자동 제거
    setTimeout(() => {
      successMessage.value = "";
    }, 3000);
  } catch (err) {
    console.error(err);
    errorMessage.value = "데이터 저장에 실패했습니다. 다시 시도해주세요.";
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #f0f4f8 0%, #dce8f2 100%);
  padding: 24px;
}

.admin-container {
  width: min(480px, 100%);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #17446d;
}

.back-link {
  font-size: 14px;
  font-weight: 600;
  color: #2c83c9;
  text-decoration: none;
  transition: color 0.2s;
}

.back-link:hover {
  color: #206ca8;
}

.data-form {
  background: #ffffffee;
  backdrop-filter: blur(4px);
  border-radius: 20px;
  padding: 28px 24px;
  box-shadow: 0 8px 24px #1d4c7a1f;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-of-type {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #254f75;
}

.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #6b8399;
}

.form-input,
.form-select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #d9e8f5;
  border-radius: 12px;
  font-size: 15px;
  color: #17446d;
  background: #fff;
  transition: border-color 0.2s;
  outline: none;
}

.form-input:focus,
.form-select:focus {
  border-color: #2c83c9;
}

.form-input::placeholder {
  color: #9db4c9;
}

.form-select {
  cursor: pointer;
}

.form-select option[value=""] {
  color: #9db4c9;
}

.submit-button {
  width: 100%;
  padding: 14px;
  border: 0;
  border-radius: 12px;
  background: #2c83c9;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.submit-button:hover:not(:disabled) {
  background: #206ca8;
}

.submit-button:disabled {
  background: #9db4c9;
  cursor: not-allowed;
}

.success-message {
  margin: 16px 0 0;
  padding: 12px;
  border-radius: 8px;
  background: #d4f4dd;
  color: #2d5f3a;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.error-message {
  margin: 16px 0 0;
  padding: 12px;
  border-radius: 8px;
  background: #fde8e8;
  color: #b34141;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}
</style>
