<template>
  <div class="container">
    <div class="header">
      <h2 class="header-title">
        <span class="title-icon" aria-hidden="true">🔔</span>
        <span>알림</span>
      </h2>
      <button class="add-btn" type="button" @click="goToAddAlarm">+</button>
    </div>

    <div class="alarm-list">
      <AlarmItem
        v-for="alarm in sortedAlarms"
        :key="alarm.id"
        :alarm="alarm"
        @remove="removeAlarm"
        @persist="persistAlarm"
      />
    </div>

    <ConfirmDialog
      :visible="isDeleteDialogOpen"
      title="알림 삭제"
      message="삭제하시겠습니까?"
      confirm-text="확인"
      cancel-text="취소"
      @confirm="confirmRemoveAlarm"
      @cancel="closeDeleteDialog"
    />

  </div>
</template>

<script setup lang="ts">
import { collection, updateDoc, deleteDoc, doc, query, where, getDocs } from "firebase/firestore";
import ConfirmDialog from "../../../components/ConfirmDialog.vue";
import AlarmItem from "./AlarmItem.vue";

import { ref, computed, onMounted } from "vue";
import { onAuthStateChanged } from "firebase/auth";
import { usePush } from "../../../composables/usePush";
import { saveUser } from "../../../composables/useUser";
import { useRegions } from "../../../composables/useRegions";

const { $db, $auth } = useNuxtApp();

// @ts-ignore - Nuxt auto-import
const router = useRouter();

const { fetchRegions } = useRegions();

const alarms = ref<any[]>([]);

const timeToMinutes = (t: unknown): number => {
  const [hs, ms] = String(t ?? "00:00").split(":");
  const h = parseInt(hs, 10);
  const m = parseInt(ms ?? "0", 10);
  const hh = Number.isFinite(h) ? Math.max(0, Math.min(23, h)) : 0;
  const mm = Number.isFinite(m) ? Math.max(0, Math.min(59, m)) : 0;
  return hh * 60 + mm;
};

const sortedAlarms = computed(() =>
  [...alarms.value].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)),
);

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const normalizeWeekdays = (raw: unknown): number[] => {
  if (!Array.isArray(raw) || raw.length === 0) return [...ALL_WEEKDAYS];
  const nums = raw.filter((x): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 6);
  if (nums.length === 0) return [...ALL_WEEKDAYS];
  return Array.from(new Set(nums)).sort((a, b) => a - b);
};

const isDeleteDialogOpen = ref(false);
const deleteTargetId = ref<string | null>(null);

const goToAddAlarm = async () => {
  const user = $auth.currentUser;
  if (!user) return;

  const token = await getCurrentFcmToken(user);
  if (!token) {
    alert("알림 권한을 허용해주세요. 설정에서 알림을 켜주세요.");
    return;
  }

  router.push("/alarm/edit/new");
};

/* 알람 삭제 */
const removeAlarm = (id: string) => {
  deleteTargetId.value = id;
  isDeleteDialogOpen.value = true;
};

const closeDeleteDialog = () => {
  isDeleteDialogOpen.value = false;
  deleteTargetId.value = null;
};

const confirmRemoveAlarm = async () => {
  const id = deleteTargetId.value;
  if (!id) return;
  await deleteDoc(doc($db, "alarms", id));
  alarms.value = alarms.value.filter((a) => a.id !== id);
  closeDeleteDialog();
};

/* 현재 FCM 토큰 가져오기 (없으면 발급 후 동기화) */
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

/* 알람 변경 즉시 저장 */
const persistAlarm = async (alarm: any) => {
  const user = $auth.currentUser;
  if (!user) return;

  const token = await getCurrentFcmToken(user);
  if (!token || !alarm?.id) return;

  await updateDoc(doc($db, "alarms", alarm.id), {
    token,
    time: alarm.time,
    region: alarm.region,
    enabled: alarm.enabled,
    weekdays: normalizeWeekdays(alarm.weekdays),
  });
};

/* 알람 불러오기 */
const loadAlarms = async (uid: string) => {
  const q = query(collection($db, "alarms"), where("uid", "==", uid));

  const snapshot = await getDocs(q);

  alarms.value = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      weekdays: normalizeWeekdays(data.weekdays),
      isNew: false,
    };
  });
};

onMounted(() => {
  onAuthStateChanged($auth, async (user) => {
    if (!user) return;
    await fetchRegions();
    await loadAlarms(user.uid);

    /* 알람 페이지 진입 시 FCM 토큰 갱신 후 동기화 */
    const token = await usePush();
    if (token) {
      localStorage.setItem("fcmToken", token);
      await saveUser(user, token);
    }
  });
});
</script>

<style scoped>
.container {
  max-width: 420px;
  margin: auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  border-radius: 24px;
  box-shadow: 0 12px 30px rgba(29, 76, 122, 0.2);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  color: #17446d;
}

.header-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 18px;
  line-height: 1;
}

.add-btn {
  font-size: 24px;
  border: none;
  background: none;
  color: #222;
  cursor: pointer;
}

</style>
