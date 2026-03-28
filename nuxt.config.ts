// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,
  css: ["~/assets/styles/reset.css"],
  runtimeConfig: {
    public: {
      weatherKey: process.env.WEATHER_API_KEY,
      /** 한국환경공단 에어코리아 (시도별 실시간) — 공공데이터포털 활용신청 키 */
      airKoreaKey: process.env.AIRKOREA_API_KEY,
    },
  },
});
