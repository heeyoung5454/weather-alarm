<template>
  <section class="panel">
    <header class="panel-head">
      <h2 class="panel-title">등록 디바이스</h2>
    </header>
    <div class="panel-body">
      <p class="hint" v-if="items.length === 0">등록된 디바이스가 없습니다.</p>

      <div v-else class="tokens-list">
        <div v-for="it in items" :key="it.token + '_' + it.idx" class="token-item" :class="{ current: it.isCurrent }">
          <button type="button" class="token-remove-btn" :disabled="disabled" aria-label="이 디바이스 삭제" @click="$emit('remove', it.token)">
            <svg class="token-remove-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>

          <button type="button" class="device-toggle-btn" :class="{ on: it.enabled }" :disabled="disabled" @click="$emit('toggle', it.token, !it.enabled)">
            {{ it.enabled ? "알림 ON" : "알림 OFF" }}
          </button>

          <span class="token-index">{{ it.idx + 1 }}</span>
          <div class="token-main">
            <div class="token-meta">
              <p class="meta-line">
                <span class="meta-key">앱 정보</span><span class="meta-val">{{ it.appVersion || "-" }}</span>
              </p>
              <p class="meta-line">
                <span class="meta-key">플랫폼</span><span class="meta-val">{{ it.platform || "-" }}</span>
              </p>
              <p class="meta-line">
                <span class="meta-key">userAgent</span><span class="meta-val">{{ it.userAgent || "-" }}</span>
              </p>
              <p class="meta-line">
                <span class="meta-key">화면</span><span class="meta-val">{{ it.screenText || "-" }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  items: {
    idx: number;
    token: string;
    enabled: boolean;
    isCurrent: boolean;
    appVersion?: string;
    platform?: string;
    userAgent?: string;
    screenText?: string;
  }[];
  disabled: boolean;
}>();

defineEmits<{
  (e: "remove", token: string): void;
  (e: "toggle", token: string, nextEnabled: boolean): void;
}>();
</script>
