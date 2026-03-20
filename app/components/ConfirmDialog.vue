<template>
  <Teleport to="body">
    <div v-if="visible" class="confirm-backdrop" @click.self="$emit('cancel')">
      <div class="confirm-modal" role="dialog" aria-modal="true">
        <h3 class="confirm-title">{{ title }}</h3>
        <p class="confirm-message">{{ message }}</p>
        <div class="confirm-actions">
          <button type="button" class="btn-cancel" @click="$emit('cancel')">
            {{ cancelText }}
          </button>
          <button type="button" class="btn-confirm" @click="$emit('confirm')">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    visible: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
  }>(),
  {
    title: "확인",
    message: "진행하시겠습니까?",
    confirmText: "확인",
    cancelText: "취소",
  }
);
</script>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.confirm-modal {
  width: min(90vw, 340px);
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.25);
  padding: 18px 16px 14px;
}

.confirm-title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #17446d;
}

.confirm-message {
  margin: 10px 0 16px;
  font-size: 14px;
  color: #4b5b6a;
  line-height: 1.5;
  white-space: pre-line;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel,
.btn-confirm {
  border: none;
  border-radius: 999px;
  min-width: 68px;
  padding: 7px 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.btn-cancel {
  background: #edf2f6;
  color: #4b5b6a;
}

.btn-confirm {
  background: #2c83c9;
  color: #fff;
}
</style>
