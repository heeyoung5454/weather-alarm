/**
 * 페이지 이동 시 Web Speech 재생 중이면 즉시 중단 (전역 speechSynthesis 공유)
 */
export default defineNuxtPlugin(() => {
  const router = useRouter();

  router.beforeEach(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
  });
});
