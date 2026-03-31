<template>
  <section>
    <div class="panel-body">
      <button type="button" class="logout-btn" :disabled="disabled" @click="$emit('logout')">로그아웃</button>
      <button type="button" class="withdraw-link" :disabled="disabled" @click="$emit('withdraw')">회원탈퇴</button>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  disabled: boolean;
}>();

defineEmits<{
  (e: "logout"): void;
  (e: "withdraw"): void;
}>();
</script>
