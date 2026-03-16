<template>
  <div class="container">
    <div class="header">
      <h2>알림</h2>
      <button class="add-btn" @click="addAlarm">+</button>
    </div>

    <div class="alarm-list">
      <div v-for="(alarm, index) in alarms" :key="alarm.id" class="alarm-item">
        <div class="alarm-main">
          <div class="time">
            <span class="time-icon" aria-hidden="true"></span>
            <button class="time-button" type="button" @click="openTimePicker(index)">
              {{ alarm.time }}
            </button>
          </div>

          <label class="switch">
            <input type="checkbox" v-model="alarm.enabled" />
            <span class="slider"></span>
          </label>
        </div>

        <div class="alarm-sub">
          <select v-model="alarm.region">
            <option v-for="region in regionKeys" :key="region" :value="region">
              {{ region }}
            </option>
          </select>

          <button class="delete-btn" @click="removeAlarm(index)">삭제</button>
        </div>
      </div>
    </div>

    <!-- 5분 단위 시간 선택 팝업 -->
    <div v-if="isTimePickerOpen" class="time-picker-backdrop" @click.self="closeTimePicker">
      <div class="time-picker-modal">
        <h3 class="time-picker-title">알림 시간 선택</h3>

        <div class="time-picker-body">
          <div class="time-picker-column">
            <p class="column-label">시</p>
            <ul class="time-list">
              <li v-for="h in hours" :key="h" :class="['time-item', { active: pickerHour === h }]" @click="pickerHour = h">
                {{ h }}
              </li>
            </ul>
          </div>
          <div class="time-picker-column">
            <p class="column-label">분</p>
            <ul class="time-list">
              <li v-for="m in minutes" :key="m" :class="['time-item', { active: pickerMinute === m }]" @click="pickerMinute = m">
                {{ m }}
              </li>
            </ul>
          </div>
        </div>

        <div class="time-picker-footer">
          <button type="button" class="picker-cancel" @click="closeTimePicker">취소</button>
          <button type="button" class="picker-confirm" @click="confirmTime">확인</button>
        </div>
      </div>
    </div>

    <button class="save-btn" @click="saveSetting">저장</button>
  </div>
</template>

<script setup lang="ts">
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from "firebase/firestore";

import { ref, onMounted } from "vue";
import { onAuthStateChanged } from "firebase/auth";
import { usePush } from "../../../composables/usePush";
import { saveUser } from "../../../composables/useUser";
import { useRegions } from "../../../composables/useRegions";

const { $db, $auth } = useNuxtApp();

const { regions: regionDocs, fetchRegions } = useRegions();
const regionKeys = computed<string[]>(() => (regionDocs.value ?? []).map((r: any) => r.name));

const alarms = ref<any[]>([]);

// 5분 단위 시간 선택용 상태
const isTimePickerOpen = ref(false);
const editingIndex = ref<number | null>(null);
const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const pickerHour = ref("07");
const pickerMinute = ref("00");

const openTimePicker = (index: number) => {
  const alarm = alarms.value[index];
  if (alarm?.time) {
    const [h, m] = String(alarm.time).split(":");
    if (hours.includes(h)) pickerHour.value = h;
    if (minutes.includes(m)) pickerMinute.value = m;
  }
  editingIndex.value = index;
  isTimePickerOpen.value = true;
};

const closeTimePicker = () => {
  isTimePickerOpen.value = false;
  editingIndex.value = null;
};

const confirmTime = () => {
  if (editingIndex.value === null) return;
  const time = `${pickerHour.value}:${pickerMinute.value}`;
  alarms.value[editingIndex.value].time = time;
  closeTimePicker();
};

const defaultAlarm = () => ({
  id: crypto.randomUUID(),
  time: "07:00",
  region: "서울",
  enabled: true,
  isNew: true,
});

/* 알람 추가 */
const addAlarm = () => {
  alarms.value.push(defaultAlarm());
};

/* 알람 삭제 */
const removeAlarm = async (index: number) => {
  await deleteDoc(doc($db, "alarms", alarms.value[index].id));
  alarms.value.splice(index, 1);
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

/* 알람 저장 */
const saveSetting = async () => {
  const user = $auth.currentUser;
  if (!user) return;

  const token = await getCurrentFcmToken(user);
  if (!token) {
    alert("알림 권한을 허용해주세요. 설정에서 알림을 켜주세요.");
    return;
  }

  for (const alarm of alarms.value) {
    if (alarm.isNew) {
      const refDoc = await addDoc(collection($db, "alarms"), {
        uid: user.uid,
        token,
        time: alarm.time,
        region: alarm.region,
        enabled: alarm.enabled,
        createdAt: new Date(),
      });

      alarm.id = refDoc.id;
      alarm.isNew = false;
    } else {
      await updateDoc(doc($db, "alarms", alarm.id), {
        token,
        time: alarm.time,
        region: alarm.region,
        enabled: alarm.enabled,
      });
    }
  }

  alert("알림 저장 완료");
};

/* 알람 불러오기 */
const loadAlarms = async (uid: string) => {
  const q = query(collection($db, "alarms"), where("uid", "==", uid));

  const snapshot = await getDocs(q);

  alarms.value = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    isNew: false,
  }));
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
}

.add-btn {
  font-size: 26px;
  border: none;
  background: none;
  cursor: pointer;
}

.alarm-item {
  border-bottom: 1px solid #eee;
  padding: 18px 0;
}

.alarm-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.time {
  display: flex;
  align-items: center;
  gap: 6px;
}

.time-icon {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 2px solid #4b5b6a;
  position: relative;
}

.time-icon::before,
.time-icon::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: bottom center;
  background: #4b5b6a;
}

.time-icon::before {
  width: 2px;
  height: 6px;
  transform: translate(-50%, -90%);
}

.time-icon::after {
  width: 2px;
  height: 4px;
  transform: translate(-10%, -50%) rotate(90deg);
}

.time-button {
  font-size: 28px;
  font-weight: 600;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}

.alarm-sub {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.time-picker-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.time-picker-modal {
  width: 320px;
  max-width: 90%;
  background: #ffffff;
  border-radius: 16px;
  padding: 18px 16px 14px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
}

.time-picker-title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}

.time-picker-body {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.time-picker-column {
  flex: 1;
}

.column-label {
  margin: 0 0 6px;
  font-size: 13px;
  color: #6b8399;
}

.time-list {
  margin: 0;
  padding: 4px 0;
  list-style: none;
  max-height: 180px;
  overflow-y: auto;
  border-radius: 10px;
  background: #f4f7fb;
}

.time-item {
  padding: 6px 8px;
  font-size: 15px;
  text-align: center;
  cursor: pointer;
  color: #4b5b6a;
}

.time-item.active {
  background: #2c83c9;
  color: #fff;
  font-weight: 600;
}

.time-picker-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.picker-cancel,
.picker-confirm {
  min-width: 72px;
  padding: 6px 10px;
  border-radius: 999px;
  border: none;
  font-size: 14px;
  cursor: pointer;
}

.picker-cancel {
  background: #edf2f6;
  color: #4b5b6a;
}

.picker-confirm {
  background: #2c83c9;
  color: #fff;
}

select {
  border: none;
  background: none;
  font-size: 14px;
  color: #666;
}

.delete-btn {
  background: none;
  border: none;
  color: #ff3b30;
  cursor: pointer;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
}

.switch input {
  opacity: 0;
}

.slider {
  position: absolute;
  inset: 0;
  background: #ccc;
  border-radius: 34px;
}

.slider:before {
  content: "";
  position: absolute;
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.2s;
}

input:checked + .slider {
  background: #34c759;
}

input:checked + .slider:before {
  transform: translateX(22px);
}

.save-btn {
  width: 100%;
  margin-top: 30px;
  padding: 14px;
  border-radius: 10px;
  border: none;
  background: #111;
  color: white;
  font-size: 16px;
  font-weight: 600;
}
</style>
