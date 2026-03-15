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
            <input type="time" v-model="alarm.time" />
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

    <button class="save-btn" @click="saveSetting">저장</button>
  </div>
</template>

<script setup lang="ts">
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from "firebase/firestore";

import { ref, onMounted } from "vue";
import { onAuthStateChanged } from "firebase/auth";
import { regions } from "../../../constants/region";
import { usePush } from "../../../composables/usePush";
import { saveUser } from "../../../composables/useUser";

const { $db, $auth } = useNuxtApp();

const regionKeys = Object.keys(regions);

const alarms = ref<any[]>([]);

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

.time input {
  font-size: 28px;
  font-weight: 600;
  border: none;
  background: none;
}

.alarm-sub {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
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
