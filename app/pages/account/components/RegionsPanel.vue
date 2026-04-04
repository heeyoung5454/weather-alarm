<template>
  <section class="panel">
    <header class="panel-head">
      <h2 class="panel-title">등록 지역</h2>
    </header>
    <div class="panel-body">
      <p class="hint" v-if="loading">등록 지역을 불러오는 중…</p>
      <p class="hint" v-else-if="items.length === 0">저장된 지역이 없습니다. 홈에서 위치를 허용하면 저장됩니다.</p>
      <ul v-else class="regions-list">
        <li v-for="r in items" :key="r.key" class="region-item">
          <span class="region-address">{{ r.address }}</span>
          <div class="region-actions">
            <span class="region-saved">{{ r.savedText }}</span>
            <button type="button" class="region-remove-btn" :disabled="disabled" aria-label="이 지역 삭제" @click="$emit('remove', r.key)">
              <svg class="region-remove-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  items: { key: string; address: string; savedText: string }[];
  loading?: boolean;
  disabled: boolean;
}>();

defineEmits<{
  (e: "remove", key: string): void;
}>();
</script>
