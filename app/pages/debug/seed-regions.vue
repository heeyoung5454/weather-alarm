<template>
  <div style="padding: 24px">
    <h1>Seed Regions</h1>
    <button @click="seed" :disabled="loading">
      {{ loading ? "시딩 중..." : "regions 컬렉션 생성" }}
    </button>
    <p v-if="message">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { collection, doc, writeBatch } from "firebase/firestore";
import { regions, regionLatLon } from "../../constants/region";

const { $db } = useNuxtApp();
const loading = ref(false);
const message = ref("");

const seed = async () => {
  loading.value = true;
  message.value = "";

  try {
    const batch = writeBatch($db);
    const col = collection($db, "regions");

    Object.keys(regions).forEach((name) => {
      const grid = regions[name as keyof typeof regions];
      const latlon = regionLatLon[name as keyof typeof regionLatLon];

      const ref = doc(col, name);
      batch.set(ref, {
        name,
        x: grid.x,
        y: grid.y,
        lat: latlon.lat,
        lon: latlon.lon,
      });
    });

    await batch.commit();
    message.value = "regions 컬렉션 시딩 완료!";
  } catch (e) {
    console.error(e);
    message.value = "에러 발생: 콘솔 확인";
  } finally {
    loading.value = false;
  }
};
</script>
