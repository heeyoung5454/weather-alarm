<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { usePush } from "./composables/usePush";

onMounted(() => {
  usePush();
});
</script>
