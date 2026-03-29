<template>
  <footer class="app-footer">
    <p class="line-1">© 2026 heeyoung</p>
    <p class="line-2">Built with Vue, Nuxt, Firebase</p>
    <p class="line-3">
      <a href="https://github.com/heeyoung5454/weather-alarm" target="_blank" rel="noopener noreferrer">GitHub</a>
      ·
      <a href="mailto:heeyoung5454@gmail.com">Email</a>
    </p>
    <p class="line-4">공공데이터포털 기상청 예보 API 사용 (VilageFcstInfoService_2.0)</p>
  </footer>
</template>

<script setup lang="ts"></script>

<style scoped>
.app-footer {
  padding: 18px 24px 28px;
  text-align: left;
  color: #4b5b6a;
  font-size: 12px;
  line-height: 1.5;
}

.line-1,
.line-2,
.line-3,
.line-4 {
  margin: 0;
  color: #17446d;
}

.line-1 {
  font-weight: 700;
}

.line-2,
.line-3,
.line-4 {
  margin-top: 2px;
}

.line-3 a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

@media (max-width: 768px) {
  .app-footer {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
