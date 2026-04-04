<template>
  <main class="alarm-page">
    <div class="page-content">
      <template v-if="isLoggedIn === true">
        <div class="container">
          <div class="header">
            <h2 class="header-title">
              <span class="title-icon" aria-hidden="true">🔔</span>
              <span>알림</span>
            </h2>
            <button class="add-btn" type="button" @click="goToAddAlarm">+</button>
          </div>

          <div class="alarm-list">
            <AlarmItem v-for="alarm in sortedAlarms" :key="alarm.id" :alarm="alarm" @remove="removeAlarm" @persist="persistAlarm" />
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

      <LoginRequiredMessage v-else-if="isLoggedIn === false" />

      <div v-else class="container container-loading">
        <p class="loading-hint">불러오는 중…</p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { collection, deleteField, updateDoc, deleteDoc, doc, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ref, computed, onMounted } from "vue";

import ConfirmDialog from "../../components/ConfirmDialog.vue";
import LoginRequiredMessage from "../../components/LoginRequiredMessage.vue";
import AlarmItem from "./components/AlarmItem.vue";

import { usePush } from "../../composables/usePush";
import { saveUser } from "../../composables/useUser";
import { useRegions } from "../../composables/useRegions";

// @ts-ignore - Nuxt auto-import
const router = useRouter();
const { $db, $auth } = useNuxtApp();
const { fetchRegions } = useRegions();

const alarms = ref<any[]>([]);
const isLoggedIn = ref<boolean | null>(null);

const timeToMinutes = (t: unknown): number => {
  const [hs, ms] = String(t ?? "00:00").split(":");
  const h = parseInt(hs, 10);
  const m = parseInt(ms ?? "0", 10);
  const hh = Number.isFinite(h) ? Math.max(0, Math.min(23, h)) : 0;
  const mm = Number.isFinite(m) ? Math.max(0, Math.min(59, m)) : 0;
  return hh * 60 + mm;
};

const sortedAlarms = computed(() => [...alarms.value].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)));

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

const persistAlarm = async (alarm: any) => {
  const user = $auth.currentUser;
  if (!user) return;

  const token = await getCurrentFcmToken(user);
  if (!token || !alarm?.id) return;

  const rs = alarm.regionSource === "saved" ? "saved" : "national";
  await updateDoc(doc($db, "alarms", alarm.id), {
    token,
    time: alarm.time,
    region: alarm.region,
    enabled: alarm.enabled,
    weekdays: normalizeWeekdays(alarm.weekdays),
    regionSource: rs,
    ...(rs === "saved" && typeof alarm.savedLat === "number"
      ? {
          savedLat: alarm.savedLat,
          savedLng: alarm.savedLng,
          savedLabel: typeof alarm.savedLabel === "string" ? alarm.savedLabel : "",
        }
      : {
          savedLat: deleteField(),
          savedLng: deleteField(),
          savedLabel: deleteField(),
        }),
  });
};

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
    if (!user) {
      isLoggedIn.value = false;
      alarms.value = [];
      return;
    }
    isLoggedIn.value = true;
    await fetchRegions();
    await loadAlarms(user.uid);

    const token = await usePush();
    if (token) {
      localStorage.setItem("fcmToken", token);
      await saveUser(user, token);
    }
  });
});
</script>

<style scoped>
.alarm-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #8ed0ff 0%, #d9f0ff 50%, #f6fbff 100%);
  padding: 24px;
  box-sizing: border-box;
}

.page-content {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.container {
  width: 100%;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  border-radius: 24px;
  box-shadow: 0 12px 30px rgba(29, 76, 122, 0.2);
  box-sizing: border-box;
}

.container-loading {
  padding: 28px 20px;
  text-align: center;
}

.loading-hint {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #4c6f8f;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  color: #17446d;
}

.title-icon {
  font-size: 18px;
  line-height: 1;
}

.add-btn {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  color: #17446d;
  font-size: 22px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(29, 76, 122, 0.12);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.add-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(29, 76, 122, 0.16);
}

@media (max-width: 768px) {
  .alarm-page {
    padding: 16px;
  }
}
</style>
