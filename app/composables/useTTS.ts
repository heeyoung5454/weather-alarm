import { ref, type Ref } from "vue";

/**
 * 브라우저에 내장된 Web Speech API 사용하여 TTS 기능 구현
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
 */
export const useTTS = () => {
  const isSpeaking: Ref<boolean> = ref(false);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      console.warn("TTS not supported");
      return;
    }

    const trimmed = typeof text === "string" ? text.trim() : "";
    if (!trimmed) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(trimmed);

    utterance.lang = "ko-KR";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      isSpeaking.value = false;
    };
    utterance.onerror = () => {
      isSpeaking.value = false;
    };

    isSpeaking.value = true;
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isSpeaking.value = false;
  };

  return { speak, stop, isSpeaking };
};
