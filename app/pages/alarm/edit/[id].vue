<template>
  <main class="alarm-page">
    <div class="alarm-shell">
      <header class="page-top-line">
        <button type="button" class="back-btn" aria-label="뒤로" @click="router.push('/alarm')">
          <svg class="back-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <h1 class="page-title">{{ pageTitle }}</h1>
      </header>

      <div v-if="loadError" class="hint-card">
        <p>{{ loadError }}</p>
        <button type="button" class="primary-btn" @click="router.push('/alarm')">목록으로</button>
      </div>

      <div v-else-if="alarm" class="edit-card">
        <div class="edit-section">
          <p class="field-label">알람시간</p>
          <div class="time-scroll-picker" role="group" aria-label="알림 시간">
            <div class="time-scroll-col">
              <div class="time-scroll-viewport">
                <ul ref="hourListRef" class="time-scroll-list" @scroll.passive="onScrollHours">
                  <li v-for="h in hours" :key="h" class="time-scroll-item">{{ h }}</li>
                </ul>
                <div class="time-scroll-highlight" aria-hidden="true"></div>
              </div>
            </div>
            <span class="time-scroll-sep">:</span>
            <div class="time-scroll-col">
              <div class="time-scroll-viewport">
                <ul ref="minuteListRef" class="time-scroll-list" @scroll.passive="onScrollMinutes">
                  <li v-for="m in minutes" :key="m" class="time-scroll-item">{{ m }}</li>
                </ul>
                <div class="time-scroll-highlight" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="edit-section">
          <p class="field-label">알람반복</p>
          <div class="alarm-weekdays" role="group" aria-label="요일">
            <div class="weekday-chips">
              <button v-for="day in ALL_WEEKDAYS" :key="day" type="button" class="weekday-pill" :class="{ on: isWeekdayOn(alarm, day) }" @click="toggleWeekday(day)">
                {{ WEEKDAY_LABELS[day] }}
              </button>
            </div>
          </div>
        </div>

        <div class="edit-section">
          <p class="field-label">설정 지역</p>
          <div class="region-mode-row" role="group" aria-label="지역 선택 방식">
            <button type="button" class="region-mode-btn" :class="{ active: alarm.regionSource === 'national' }" @click="setRegionMode('national')">전국 지역</button>
            <button type="button" class="region-mode-btn" :class="{ active: alarm.regionSource === 'saved' }" @click="setRegionMode('saved')">내 저장 지역</button>
          </div>

          <select v-if="alarm.regionSource === 'national'" v-model="alarm.region" class="region-select">
            <option v-for="region in regionKeys" :key="region" :value="region">
              {{ region }}
            </option>
          </select>

          <template v-else>
            <p v-if="userRegions.length === 0" class="region-hint">저장된 지역이 없습니다. 홈에서 위치를 허용하거나 계정에서 확인해 주세요.</p>
            <select v-else v-model="savedKeyForUi" class="region-select" @change="onSavedRegionSelect">
              <option v-for="e in userRegions" :key="userRegionKey(e)" :value="userRegionKey(e)">
                {{ savedRegionOptionLabel(e) }}
              </option>
            </select>
          </template>
        </div>

        <div class="edit-actions">
          <button type="button" class="save-btn" :disabled="saveLoading" @click="save">{{ saveButtonLabel }}</button>
        </div>
      </div>

      <div v-else class="hint-card">
        <p>불러오는 중...</p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { addDoc, collection, deleteField, doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { usePush } from "../../../composables/usePush";
import { saveUser } from "../../../composables/useUser";
import { useRegions } from "../../../composables/useRegions";
import type { UserRegionEntry } from "../../../composables/useUserRegions";

// @ts-ignore
const router = useRouter();
// @ts-ignore
const route = useRoute();
const { $db, $auth } = useNuxtApp();

const { regions: regionDocs, fetchRegions } = useRegions();
const regionKeys = computed<string[]>(() => (regionDocs.value ?? []).map((r: any) => r.name));

const userRegions = ref<UserRegionEntry[]>([]);
const savedKeyForUi = ref("");

const userRegionKey = (e: UserRegionEntry) => `${Number(e.lat).toFixed(5)},${Number(e.lng).toFixed(5)}`;

const savedRegionOptionLabel = (e: UserRegionEntry) => {
  if (typeof e.label === "string" && e.label.trim()) return e.label.trim();
  return `${Number(e.lat).toFixed(4)}, ${Number(e.lng).toFixed(4)}`;
};

const loadUserRegions = async (uid: string) => {
  const snap = await getDoc(doc($db, "userRegions", uid));
  const arr = snap.data()?.regions;
  userRegions.value = Array.isArray(arr) ? arr : [];
};

const applyUserRegionEntry = (e: UserRegionEntry) => {
  if (!alarm.value) return;
  alarm.value.savedLat = e.lat;
  alarm.value.savedLng = e.lng;
  alarm.value.savedLabel = typeof e.label === "string" ? e.label : "";
  alarm.value.region = alarm.value.savedLabel.trim() || "저장 지역";
  savedKeyForUi.value = userRegionKey(e);
};

const onSavedRegionSelect = () => {
  const e = userRegions.value.find((r) => userRegionKey(r) === savedKeyForUi.value);
  if (e) applyUserRegionEntry(e);
};

const setRegionMode = (mode: "national" | "saved") => {
  if (!alarm.value) return;
  if (mode === "saved" && userRegions.value.length === 0) {
    alert("저장된 지역이 없습니다. 홈에서 위치를 허용하거나 계정에서 확인해 주세요.");
    return;
  }
  alarm.value.regionSource = mode;
  if (mode === "national") {
    const keys = regionKeys.value;
    if (keys.length && !keys.includes(alarm.value.region)) {
      alarm.value.region = keys[0];
    }
  } else if (mode === "saved") {
    const first = userRegions.value[0];
    if (first) applyUserRegionEntry(first);
  }
};

const isCreateMode = computed(() => String(route.params.id || "") === "new");
const pageTitle = computed(() => (isCreateMode.value ? "알림 등록" : "알림 수정"));
const saveButtonLabel = computed(() => (isCreateMode.value ? "등록" : "저장"));

const alarm = ref<any>(null);
const loadError = ref("");

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const normalizeWeekdays = (raw: unknown): number[] => {
  if (!Array.isArray(raw) || raw.length === 0) return [...ALL_WEEKDAYS];
  const nums = raw.filter((x): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 6);
  if (nums.length === 0) return [...ALL_WEEKDAYS];
  return Array.from(new Set(nums)).sort((a, b) => a - b);
};

const isWeekdayOn = (a: any, day: number) => normalizeWeekdays(a.weekdays).includes(day);

const toggleWeekday = (day: number) => {
  if (!alarm.value) return;
  let w = normalizeWeekdays(alarm.value.weekdays);
  const set = new Set(w);
  if (set.has(day)) {
    if (set.size <= 1) return;
    set.delete(day);
  } else {
    set.add(day);
  }
  alarm.value.weekdays = Array.from(set).sort((a, b) => a - b);
};

const getCurrentFcmToken = async (user: any): Promise<string | null> => {
  let token = localStorage.getItem("fcmToken");
  if (token) return token;
  token = (await usePush()) ?? null;
  if (token && user) {
    localStorage.setItem("fcmToken", token);
    await saveUser(user, token);
  }
  return token;
};

const saveLoading = ref(false);

const save = async () => {
  const user = $auth.currentUser;
  if (!user || !alarm.value) return;
  const token = await getCurrentFcmToken(user);
  if (!token) {
    alert("알림 토큰을 확인할 수 없습니다.");
    return;
  }

  const a = alarm.value;
  if (a.regionSource === "saved") {
    if (typeof a.savedLat !== "number" || typeof a.savedLng !== "number") {
      alert("저장 지역을 선택해 주세요.");
      return;
    }
  }

  saveLoading.value = true;
  try {
    const commonFields = {
      token,
      time: a.time,
      enabled: a.enabled,
      weekdays: normalizeWeekdays(a.weekdays),
    };

    if (isCreateMode.value) {
      const base = {
        uid: user.uid,
        ...commonFields,
        createdAt: new Date(),
      };
      if (a.regionSource === "saved") {
        await addDoc(collection($db, "alarms"), {
          ...base,
          regionSource: "saved",
          region: a.region,
          savedLat: a.savedLat,
          savedLng: a.savedLng,
          savedLabel: typeof a.savedLabel === "string" ? a.savedLabel : "",
        });
      } else {
        await addDoc(collection($db, "alarms"), {
          ...base,
          regionSource: "national",
          region: a.region,
        });
      }
    } else if (a.id) {
      if (a.regionSource === "saved") {
        await updateDoc(doc($db, "alarms", a.id), {
          ...commonFields,
          regionSource: "saved",
          region: a.region,
          savedLat: a.savedLat,
          savedLng: a.savedLng,
          savedLabel: typeof a.savedLabel === "string" ? a.savedLabel : "",
        });
      } else {
        await updateDoc(doc($db, "alarms", a.id), {
          ...commonFields,
          regionSource: "national",
          region: a.region,
          savedLat: deleteField(),
          savedLng: deleteField(),
          savedLabel: deleteField(),
        });
      }
    }
    router.push("/alarm");
  } catch {
    alert(isCreateMode.value ? "등록에 실패했습니다." : "저장에 실패했습니다.");
  } finally {
    saveLoading.value = false;
  }
};

const ITEM_HEIGHT = 40;

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

const hourListRef = ref<HTMLElement | null>(null);
const minuteListRef = ref<HTMLElement | null>(null);

const normalizeTimeToFiveMin = (time: string): string => {
  const [hs, ms] = String(time).split(":");
  let h = parseInt(hs, 10);
  let m = parseInt(ms ?? "0", 10);
  if (Number.isNaN(h)) h = 6;
  if (Number.isNaN(m)) m = 0;
  h = Math.max(0, Math.min(23, h));
  const m5 = Math.min(55, Math.round(m / 5) * 5);
  const hStr = String(h).padStart(2, "0");
  const mStr = String(m5).padStart(2, "0");
  const hOk = hours.includes(hStr) ? hStr : "06";
  const mOk = minutes.includes(mStr) ? mStr : "00";
  return `${hOk}:${mOk}`;
};

const syncTimeFromScroll = () => {
  if (!alarm.value || !hourListRef.value || !minuteListRef.value) return;
  const hi = Math.round(hourListRef.value.scrollTop / ITEM_HEIGHT);
  const mi = Math.round(minuteListRef.value.scrollTop / ITEM_HEIGHT);
  const h = hours[Math.max(0, Math.min(hours.length - 1, hi))];
  const m = minutes[Math.max(0, Math.min(minutes.length - 1, mi))];
  const next = `${h}:${m}`;
  if (alarm.value.time !== next) alarm.value.time = next;
};

const onScrollHours = () => syncTimeFromScroll();
const onScrollMinutes = () => syncTimeFromScroll();

const syncScrollFromAlarmTime = () => {
  if (!alarm.value?.time) return;
  const [h, m] = alarm.value.time.split(":");
  const hi = hours.indexOf(h);
  const mi = minutes.indexOf(m);
  const safeH = hi >= 0 ? hi : 0;
  const safeM = mi >= 0 ? mi : 0;
  nextTick(() => {
    if (hourListRef.value) hourListRef.value.scrollTop = safeH * ITEM_HEIGHT;
    if (minuteListRef.value) minuteListRef.value.scrollTop = safeM * ITEM_HEIGHT;
  });
};

const initNewAlarm = () => {
  alarm.value = {
    id: null,
    time: "06:00",
    region: "서울",
    regionSource: "national",
    enabled: true,
    weekdays: [...ALL_WEEKDAYS],
  };
};

const loadAlarm = async (id: string) => {
  const user = $auth.currentUser;
  if (!user) {
    loadError.value = "로그인이 필요합니다.";
    return;
  }

  if (id === "new") {
    initNewAlarm();
    savedKeyForUi.value = "";
    syncScrollFromAlarmTime();
    return;
  }

  const snap = await getDoc(doc($db, "alarms", id));
  if (!snap.exists()) {
    loadError.value = "알림을 찾을 수 없습니다.";
    return;
  }

  const data: any = snap.data();
  if (data.uid !== user.uid) {
    loadError.value = "권한이 없습니다.";
    return;
  }

  alarm.value = {
    id: snap.id,
    ...data,
    weekdays: normalizeWeekdays(data.weekdays),
  };
  alarm.value.time = normalizeTimeToFiveMin(String(alarm.value.time ?? "06:00"));
  if (!alarm.value.regionSource) alarm.value.regionSource = "national";
  if (alarm.value.regionSource === "saved") {
    if (typeof alarm.value.savedLat !== "number" || typeof alarm.value.savedLng !== "number") {
      alarm.value.regionSource = "national";
      if (!alarm.value.region) alarm.value.region = "서울";
    } else {
      const key = `${alarm.value.savedLat.toFixed(5)},${alarm.value.savedLng.toFixed(5)}`;
      const stillExists = userRegions.value.some((r) => userRegionKey(r) === key);
      if (!stillExists) {
        alarm.value.regionSource = "national";
        if (!alarm.value.region) alarm.value.region = "서울";
        savedKeyForUi.value = "";
      } else {
        savedKeyForUi.value = key;
      }
    }
  }
  syncScrollFromAlarmTime();
};

let unsubAuth: (() => void) | null = null;

onMounted(() => {
  const id = String(route.params.id || "");
  if (!id) {
    loadError.value = "잘못된 경로입니다.";
    return;
  }

  unsubAuth = onAuthStateChanged($auth, async (user) => {
    if (!user) {
      loadError.value = "로그인이 필요합니다.";
      return;
    }
    loadError.value = "";
    await fetchRegions();
    await loadUserRegions(user.uid);
    await loadAlarm(id);
  });
});

onUnmounted(() => {
  unsubAuth?.();
});
</script>

<style scoped>
.alarm-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #8ed0ff 0%, #d9f0ff 50%, #f6fbff 100%);
  padding: 24px;
  box-sizing: border-box;
}

.alarm-shell {
  max-width: 480px;
  margin: 0 auto;
}

.page-top-line {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  position: relative;
  max-width: 480px;
  margin: 0 auto 14px;
  padding: 8px 0 14px;
  border-bottom: 1px solid rgba(23, 68, 109, 0.18);
}

.back-btn {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #17446d;
  background: transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.back-btn:hover {
  background: rgba(23, 68, 109, 0.08);
}

.back-icon {
  width: 22px;
  height: 22px;
}

.page-title {
  margin: 0;
  width: 100%;
  padding: 0 40px;
  box-sizing: border-box;
  font-size: 20px;
  font-weight: 800;
  color: #17446d;
  text-align: center;
}

@media (max-width: 768px) {
  .alarm-page {
    padding: 16px;
  }
}

.hint-card {
  width: 100%;
  padding: 20px;
  text-align: center;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  border-radius: 24px;
  box-shadow: 0 12px 30px rgba(29, 76, 122, 0.2);
  color: #4b5b6a;
  font-family: -apple-system, BlinkMacSystemFont;
}

.primary-btn {
  margin-top: 12px;
  padding: 10px 20px;
  border-radius: 999px;
  border: none;
  background: #2c83c9;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.edit-card {
  width: 100%;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  border-radius: 24px;
  box-shadow: 0 12px 30px rgba(29, 76, 122, 0.2);
}

.edit-section {
  margin-bottom: 22px;
}

.edit-actions {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid #d8e7f3;
}

.save-btn {
  width: 100%;
  padding: 14px 16px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #2c83c9 0%, #17446d 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(44, 131, 201, 0.35);
  transition:
    opacity 0.15s,
    transform 0.1s;
}

.save-btn:hover:not(:disabled) {
  opacity: 0.95;
}

.save-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.save-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.field-label {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 800;
  color: #6b8399;
}

.time-scroll-picker {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  max-width: 300px;
  margin-top: 4px;
}

.time-scroll-col {
  flex: 1;
  min-width: 0;
}

.time-scroll-viewport {
  position: relative;
  height: 120px;
  border-radius: 12px;
  border: 1px solid #d8e7f3;
  background: #f4f7fb;
  overflow: hidden;
}

/* 위·아래만 덮어서 가운데 선택 줄은 진하게 보이게 */
.time-scroll-viewport::before,
.time-scroll-viewport::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 40px;
  pointer-events: none;
  z-index: 3;
}

.time-scroll-viewport::before {
  top: 0;
  background: linear-gradient(to bottom, rgba(244, 247, 251, 0.98), rgba(244, 247, 251, 0));
}

.time-scroll-viewport::after {
  bottom: 0;
  background: linear-gradient(to top, rgba(244, 247, 251, 0.98), rgba(244, 247, 251, 0));
}

.time-scroll-list {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 40px 0;
  box-sizing: border-box;
  list-style: none;
  height: 100%;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.time-scroll-item {
  height: 40px;
  scroll-snap-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 800;
  color: #17446d;
}

.time-scroll-highlight {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: calc(100% - 12px);
  height: 40px;
  border-radius: 8px;
  border: 1px solid rgba(44, 131, 201, 0.45);
  background: transparent;
  pointer-events: none;
  z-index: 2;
}

.time-scroll-sep {
  font-size: 22px;
  font-weight: 800;
  color: #6b8399;
  padding: 0 2px;
  flex-shrink: 0;
  align-self: center;
}

.weekday-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 4px;
}

.weekday-pill {
  min-width: 28px;
  padding: 4px 7px;
  border: none;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  color: #9aa8b5;
  background: #e8eef4;
  text-align: center;
  cursor: pointer;
  appearance: none;
}

.weekday-pill.on {
  color: #17446d;
}

.weekday-pill:focus-visible {
  outline: 2px solid #2c83c9;
  outline-offset: 1px;
}

.region-mode-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.region-mode-btn {
  flex: 1;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #d8e7f3;
  background: #f4f7fb;
  font-size: 14px;
  font-weight: 700;
  color: #6b8399;
  cursor: pointer;
}

.region-mode-btn.active {
  border-color: #2c83c9;
  background: #e8f4ff;
  color: #17446d;
}

.region-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: #6b8399;
}

.region-select {
  width: 100%;
  max-width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #d8e7f3;
  background: #f4f7fb;
  font-size: 15px;
  color: #17446d;
  font-weight: 600;
}
</style>
