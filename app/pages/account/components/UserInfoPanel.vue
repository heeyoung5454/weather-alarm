<template>
  <section class="panel">
    <header class="panel-head">
      <h2 class="panel-title">사용자 정보</h2>
    </header>
    <div class="panel-body">
      <p class="row">
        <span class="label">이메일</span>
        <span class="value">{{ email }}</span>
      </p>
      <p class="row">
        <span class="label">이름</span>
        <span class="value">{{ name }}</span>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  email: string;
  name: string;
}>();
</script>

