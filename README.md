# Weather Alarm

지역/현재 위치 기준 날씨 조회, 알림 설정, 푸시 알림 기능을 제공하는 Nuxt 기반 프로젝트입니다.

## 실행 방법

의존성 설치:

```bash
npm install
```

개발 서버 실행:

```bash
npm run dev
```

기본 접속 주소: `https://weatheralarm-155bf.web.app/`

## 기술 스택

- Frontend: `Nuxt 4`, `Vue 3`, `TypeScript`
- Backend/Infra: `Firebase` (Auth, Firestore, Cloud Functions, Cloud Messaging)
- Weather API: 공공데이터포털 기상청 예보 API (`VilageFcstInfoService_2.0`)
- 미세먼지 정보 : 공공데이터 포털 한국환경공단\_대기오염정보 API (`ArpltnInforInqireSvc`)

## 핵심 기능

- 현재 위치/지역 파라미터 기준 현재 날씨, 시간대별(3시간 간격), 주간 날씨 조회
- 전국 지역 날씨 캐시(`regionWeatherCache`) 기반 지도형 조회
- 알림 시간/지역/활성화 설정 및 즉시 Firestore 반영
- 사용자별 강수 알림 ON/OFF 설정(`users.isPush`)
- 스케줄러 기반 예보 저장(`users.Forecast`) 및 강수 예보 푸시 알림 전송
