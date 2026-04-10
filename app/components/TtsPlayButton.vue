<template>
  <button
    type="button"
    class="tts-play-btn"
    :class="{ playing: isSpeaking }"
    :disabled="buttonDisabled"
    :aria-pressed="isSpeaking"
    :aria-label="isSpeaking ? stopAriaLabel : playAriaLabel"
    @click="toggle"
  >
    <span class="tts-play-btn__icon" aria-hidden="true">{{ isSpeaking ? stopIcon : playIcon }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue";
import { useTTS } from "../composables/useTTS";

const props = withDefaults(
  defineProps<{
    /** `speak()`에 그대로 넘기는 읽을 문자열 */
    text: string;
    /** 재생 불가 (데이터 로딩 등) */
    disabled?: boolean;
    playLabel?: string;
    stopLabel?: string;
    playIcon?: string;
    stopIcon?: string;
    playAriaLabel?: string;
    stopAriaLabel?: string;
  }>(),
  {
    disabled: false,
    playIcon: "🔊",
    stopIcon: "⏹",
    playAriaLabel: "음성으로 듣기",
    stopAriaLabel: "음성 재생 정지",
  }
);

const { speak, stop, isSpeaking } = useTTS();

const hasText = computed(() => typeof props.text === "string" && props.text.trim().length > 0);

/** 재생 중에는 로딩 등으로 disabled여도 정지는 허용 */
const buttonDisabled = computed(() => {
  if (isSpeaking.value) return false;
  return props.disabled || !hasText.value;
});

function toggle() {
  if (isSpeaking.value) {
    stop();
    return;
  }
  if (!hasText.value) return;
  speak(props.text.trim());
}

watch(
  () => props.text,
  () => {
    if (isSpeaking.value) stop();
  }
);

onBeforeUnmount(() => {
  stop();
});
</script>

<style scoped>
.tts-play-btn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  flex-shrink: 0;
  font-weight: 700;
  color: #17446d;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(44, 131, 201, 0.35);
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(29, 76, 122, 0.1);
  transition:
    background 0.2s,
    box-shadow 0.2s,
    transform 0.15s;
}

.tts-play-btn:hover:not(:disabled) {
  background: #fff;
  box-shadow: 0 6px 16px rgba(29, 76, 122, 0.14);
}

.tts-play-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.tts-play-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tts-play-btn.playing {
  border-color: rgba(217, 65, 65, 0.45);
  color: #a33030;
}

.tts-play-btn__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  font-size: 18px;
  line-height: 1;
}
</style>
