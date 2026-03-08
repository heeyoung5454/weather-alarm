<template>
  <main class="admin-page">
    <div class="admin-container">
      <header class="page-header">
        <NuxtLink to="/" class="home-button" title="홈으로">
          <svg class="home-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M9 22V12h6v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </NuxtLink>
        <h1 class="page-title">옷 추천 목록</h1>
        <div class="header-actions">
          <NuxtLink to="/admin/addClothes" class="add-button">+ 추가</NuxtLink>
        </div>
      </header>

      <!-- 검색 -->
      <div class="search-box">
        <input v-model="search" type="text" class="search-input" placeholder="🔍 옷 이름으로 검색..." />
        <span class="search-count">총 {{ filteredClothes.length }}개</span>
      </div>

      <!-- 카드 그리드 -->
      <div v-if="filteredClothes.length > 0" class="clothes-grid">
        <article v-for="item in filteredClothes" :key="item.id" class="cloth-card">
          <button type="button" class="delete-button" @click="deleteClothes(item.id)" title="삭제">
            <svg class="delete-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <div class="cloth-image">
            <img :src="item.imageUrl" :alt="item.clothName" />
          </div>
          <div class="cloth-info">
            <h3 class="cloth-name">{{ item.clothesName }}</h3>
            <p class="cloth-temp">{{ item.temperature }}°C</p>
            <p class="cloth-date">{{ formatDate(item.createdAt) }}</p>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <p class="empty-text">등록된 옷이 없습니다</p>
        <NuxtLink to="/admin/addClothes" class="empty-button">첫 옷 등록하기</NuxtLink>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

// @ts-ignore - Nuxt auto-import
const { $db } = useNuxtApp();

const clothes = ref<any[]>([]);
const search = ref("");

// 의류정보 조회
const fetchClothes = async () => {
  const querySnapshot = await getDocs(collection($db, "clothes"));

  clothes.value = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

onMounted(() => {
  fetchClothes();
});

// 검색 필터
const filteredClothes = computed(() => {
  return clothes.value.filter((item) => item.clothesName?.toLowerCase().includes(search.value.toLowerCase()));
});

// 날짜 포맷
const formatDate = (date: any) => {
  if (!date) return "";
  return new Date(date.seconds * 1000).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// 의류정보 삭제
const deleteClothes = async (id: string) => {
  const confirmed = window.confirm("정말 삭제하시겠습니까?");

  if (!confirmed) {
    return;
  }

  try {
    await deleteDoc(doc($db, "clothes", id));
    await fetchClothes();
  } catch (error) {
    console.error("삭제 실패:", error);
    alert("삭제에 실패했습니다. 다시 시도해주세요.");
  }
};
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f4f8 0%, #dce8f2 100%);
  padding: 24px;
}

.admin-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: #17446d;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.add-button {
  padding: 10px 18px;
  background: #2c83c9;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  border-radius: 10px;
  text-decoration: none;
  transition: background 0.2s;
}

.add-button:hover {
  background: #206ca8;
}

.home-button {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #ffffffee;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px #1d4c7a1a;
  color: #4c6f8f;
  text-decoration: none;
  transition: all 0.2s;
}

.home-button:hover {
  background: #2c83c9;
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px #1d4c7a2a;
}

.home-icon {
  width: 22px;
  height: 22px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  background: #ffffffee;
  backdrop-filter: blur(4px);
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 4px 12px #1d4c7a1a;
}

.search-input {
  flex: 1;
  border: 0;
  background: transparent;
  font-size: 15px;
  color: #17446d;
  outline: none;
}

.search-input::placeholder {
  color: #9db4c9;
}

.search-count {
  font-size: 13px;
  font-weight: 600;
  color: #4c6f8f;
  white-space: nowrap;
}

.clothes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.cloth-card {
  background: #ffffffee;
  backdrop-filter: blur(4px);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px #1d4c7a1a;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  position: relative;
}

.cloth-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px #1d4c7a2a;
}

.delete-button {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: #ffffffee;
  backdrop-filter: blur(4px);
  color: #b34141;
  cursor: pointer;
  transition:
    background 0.2s,
    transform 0.2s;
  z-index: 1;
  padding: 0;
}

.delete-button:hover {
  background: #fde8e8;
  transform: scale(1.1);
}

.delete-button:active {
  transform: scale(0.95);
}

.delete-icon {
  width: 20px;
  height: 20px;
}

.cloth-image {
  width: 100%;
  height: 180px;
  background: #f0f4f8;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.cloth-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cloth-info {
  padding: 16px;
}

.cloth-name {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: #17446d;
}

.cloth-temp {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
  color: #2c83c9;
}

.cloth-date {
  margin: 0;
  font-size: 12px;
  color: #6b8399;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: #ffffffee;
  backdrop-filter: blur(4px);
  border-radius: 16px;
  box-shadow: 0 4px 12px #1d4c7a1a;
}

.empty-text {
  margin: 0 0 20px;
  font-size: 16px;
  color: #6b8399;
}

.empty-button {
  display: inline-block;
  padding: 12px 24px;
  background: #2c83c9;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  border-radius: 10px;
  text-decoration: none;
  transition: background 0.2s;
}

.empty-button:hover {
  background: #206ca8;
}
</style>
