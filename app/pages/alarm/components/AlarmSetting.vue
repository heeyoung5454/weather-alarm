<template>
  <div class="container">
    <div class="header">
      <h2>알림</h2>
      <button class="add-btn" @click="addAlarm">+</button>
    </div>

    <div class="alarm-list">
      <div v-for="alarm in alarms" :key="alarm.id" class="alarm-item">
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
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, onMounted } from "vue";
import { onAuthStateChanged } from "firebase/auth";
import { regions } from "../../../constants/region";

const { $db, $auth } = useNuxtApp();

const regionKeys = Object.keys(regions);

const alarms = ref<any[]>([]);

const defaultAlarm = () => ({
  id: crypto.randomUUID(),
  time: "07:00",
  region: "서울",
  enabled: true,
});

const addAlarm = () => {
  alarms.value.push(defaultAlarm());
};

const removeAlarm = (index: number) => {
  alarms.value.splice(index, 1);
};

const saveSetting = async () => {
  const user = $auth.currentUser;
  if (!user) return;

  await updateDoc(doc($db, "users", user.uid), {
    alarms: alarms.value,
  });

  alert("알림 저장 완료");
};

const loadAlarms = async (uid: string) => {
  const snapshot = await getDoc(doc($db, "users", uid));

  if (!snapshot.exists()) {
    alarms.value = [defaultAlarm()];
    return;
  }

  const data = snapshot.data();

  if (data.alarms && data.alarms.length > 0) {
    alarms.value = data.alarms;
  } else {
    alarms.value = [defaultAlarm()];
  }

  console.log("불러온 알람", alarms.value);
};

onMounted(() => {
  onAuthStateChanged($auth, async (user) => {
    if (!user) return;

    await loadAlarms(user.uid);
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

/* iOS switch */

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #ccc;
  transition: 0.2s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #34c759;
}

input:checked + .slider:before {
  transform: translateX(22px);
}

.save-btn {
  width: 100%;
  margin-top: 30px;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: #111;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
</style>
