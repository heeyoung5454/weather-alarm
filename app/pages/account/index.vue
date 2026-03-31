<template>
  <main class="account-page">
    <div class="page-content">
      <div v-if="isLoggedIn === true" class="account-stack">
        <UserInfoPanel :email="userEmail" :name="userName" />
        <RegionsPanel :items="regionPanelItems" :disabled="panelDisabled" @remove="openDeleteRegionDialogByKey" />
        <DevicesPanel :items="devicePanelItems" :disabled="panelDisabled" @remove="openDeleteDeviceDialog" @toggle="toggleDevicePush" />
        <AccountActionsPanel :disabled="panelDisabled" @logout="handleLogout" @withdraw="openWithdrawDialog" />
      </div>

      <div v-else-if="isLoggedIn === false" class="panel">
        <div class="panel-body">
          <p class="hint">로그인이 필요합니다.</p>
          <button type="button" class="back-btn" :disabled="logoutLoading" @click="router.push('/')">홈으로</button>
        </div>
      </div>

      <div v-else class="panel">
        <div class="panel-body">
          <p class="hint">계정 정보를 불러오는 중...</p>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :visible="isWithdrawDialogOpen"
      title="회원탈퇴"
      message="정말로 탈퇴하시겠습니까?"
      confirm-text="예"
      cancel-text="아니오"
      @confirm="confirmWithdraw"
      @cancel="closeWithdrawDialog"
    />

    <ConfirmDialog
      :visible="isDeleteDeviceDialogOpen"
      title="디바이스 삭제"
      message="이 디바이스를 목록에서 삭제할까요?"
      confirm-text="삭제"
      cancel-text="취소"
      @confirm="confirmDeleteDevice"
      @cancel="closeDeleteDeviceDialog"
    />

    <ConfirmDialog
      :visible="isDeleteRegionDialogOpen"
      title="등록 지역"
      message="지역을 해제하시겠습니까?"
      confirm-text="예"
      cancel-text="아니오"
      @confirm="confirmDeleteRegion"
      @cancel="closeDeleteRegionDialog"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { deleteUser, onAuthStateChanged, signOut } from "firebase/auth";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import { formatKoreanAddressLine, getRegionName } from "../../utils/reverseGeo";
import UserInfoPanel from "./components/UserInfoPanel.vue";
import RegionsPanel from "./components/RegionsPanel.vue";
import DevicesPanel from "./components/DevicesPanel.vue";
import AccountActionsPanel from "./components/AccountActionsPanel.vue";

// @ts-ignore - Nuxt auto-import
const router = useRouter();

const { $auth, $db } = useNuxtApp();

const isLoggedIn = ref<boolean | null>(null);
const userEmail = ref("");
const userName = ref("");
const logoutLoading = ref(false);
const withdrawLoading = ref(false);
const isWithdrawDialogOpen = ref(false);
const isDeleteDeviceDialogOpen = ref(false);
const deleteTargetToken = ref("");
const deleteDeviceLoading = ref(false);
const isDeleteRegionDialogOpen = ref(false);
const deleteTargetRegion = ref<any>(null);
const deleteRegionLoading = ref(false);
const fcmTokenEntries = ref<any[]>([]);
const userRegions = ref<any[]>([]);
const regionLabelByKey = ref<Record<string, string>>({});
const regionAddressLoading = ref(false);
const currentToken = ref("");

const panelDisabled = computed(() => logoutLoading.value || withdrawLoading.value || deleteDeviceLoading.value || deleteRegionLoading.value);

const regionCoordKey = (r: any): string => {
  if (typeof r?.lat !== "number" || typeof r?.lng !== "number") return "";
  return `${r.lat.toFixed(5)},${r.lng.toFixed(5)}`;
};

const fetchRegionLabels = async (list: any[]) => {
  const next: Record<string, string> = {};
  const needFetch: any[] = [];
  for (const r of list) {
    const k = regionCoordKey(r);
    if (!k) continue;
    if (typeof r.label === "string" && r.label.trim()) {
      next[k] = r.label.trim();
    } else {
      needFetch.push(r);
    }
  }
  regionLabelByKey.value = next;
  if (!needFetch.length) return;

  regionAddressLoading.value = true;
  try {
    for (const r of needFetch) {
      const k = regionCoordKey(r);
      if (!k) continue;
      try {
        const res = await getRegionName(r.lat, r.lng);
        const text = formatKoreanAddressLine(res);
        next[k] = text.trim() || formatLatLng(r.lat, r.lng);
      } catch {
        next[k] = formatLatLng(r.lat, r.lng);
      }
    }
    regionLabelByKey.value = { ...next };
  } finally {
    regionAddressLoading.value = false;
  }
};

const regionDisplayLine = (r: any) => {
  if (typeof r?.label === "string" && r.label.trim()) return r.label.trim();
  const k = regionCoordKey(r);
  if (!k) return "-";
  const cached = regionLabelByKey.value[k];
  if (cached !== undefined) return cached;
  if (regionAddressLoading.value) return "주소 불러오는 중…";
  return formatLatLng(r.lat, r.lng);
};

const displayedTokenEntries = computed(() => {
  const list = Array.isArray(fcmTokenEntries.value) ? fcmTokenEntries.value : [];
  if (!currentToken.value) return list;
  const current = list.filter((t: any) => getToken(t) === currentToken.value);
  const rest = list.filter((t: any) => getToken(t) !== currentToken.value);
  return [...current, ...rest];
});

const regionPanelItems = computed(() =>
  (sortedUserRegions.value ?? []).map((r: any) => ({
    key: regionEntryKey(r),
    address: regionDisplayLine(r),
    savedText: formatRegionSavedAt(r?.savedAt),
  }))
);

const devicePanelItems = computed(() =>
  (displayedTokenEntries.value ?? []).map((t: any, idx: number) => ({
    idx,
    token: getToken(t),
    enabled: getEnabled(t) !== false,
    isCurrent: getToken(t) === currentToken.value,
    appVersion: getAppVersion(t) || "",
    platform: getPlatform(t) || "",
    userAgent: getUserAgent(t) || "",
    screenText: getScreenText(t) || "",
  }))
);

const regionSavedMs = (v: any): number => {
  if (v == null) return 0;
  if (typeof v.toDate === "function") return v.toDate().getTime();
  if (typeof v.seconds === "number") return v.seconds * 1000;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

const regionEntryKey = (r: any): string => {
  const k = regionCoordKey(r);
  return `${k}|${regionSavedMs(r?.savedAt)}`;
};

const openDeleteRegionDialogByKey = (key: string) => {
  const r = (sortedUserRegions.value ?? []).find((e: any) => regionEntryKey(e) === key);
  if (!r) return;
  openDeleteRegionDialog(r);
};

const sortedUserRegions = computed(() => {
  const list = [...(userRegions.value ?? [])];
  return list.sort((a, b) => regionSavedMs(b?.savedAt) - regionSavedMs(a?.savedAt));
});

const formatLatLng = (lat: unknown, lng: unknown) => {
  if (typeof lat !== "number" || typeof lng !== "number") return "-";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

const formatRegionSavedAt = (v: any) => {
  if (v == null) return "-";
  let d: Date;
  if (typeof v.toDate === "function") d = v.toDate();
  else if (typeof v.seconds === "number") d = new Date(v.seconds * 1000);
  else d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("ko-KR");
};

const maskToken = (token: string) => {
  const t = token.trim();
  if (t.length <= 10) return t;
  return `${t.slice(0, 10)}...${t.slice(-6)}`;
};

const getToken = (item: any): string => {
  return typeof item?.token === "string" ? item.token : "";
};

const getEnabled = (item: any): boolean => {
  return typeof item?.enabled === "boolean" ? item.enabled : true;
};

const getMeta = (item: any): any => {
  return item?.meta ?? {};
};

const getUserAgent = (item: any): string => {
  const m: any = getMeta(item) ?? {};
  return (typeof m.userAgent === "string" && m.userAgent.trim().length > 0 ? m.userAgent : typeof m.ua === "string" && m.ua.trim().length > 0 ? m.ua : "") as string;
};

const getAppVersion = (item: any): string => {
  const m: any = getMeta(item) ?? {};
  return typeof m.appVersion === "string" && m.appVersion.trim().length > 0 ? m.appVersion : "";
};

const getPlatform = (item: any): string => {
  const m: any = getMeta(item) ?? {};
  return typeof m.platform === "string" && m.platform.trim().length > 0 ? m.platform : "";
};

const getScreenText = (item: any): string => {
  const m: any = getMeta(item) ?? {};
  if (typeof m.screen === "string" && m.screen.trim().length > 0) return m.screen;
  if (typeof m.innerWidth === "number" && typeof m.innerHeight === "number") return `${m.innerWidth}x${m.innerHeight}`;
  if (typeof m.screenWidth === "number" && typeof m.screenHeight === "number") return `${m.screenWidth}x${m.screenHeight}`;
  return "";
};

const openDeleteRegionDialog = (r: any) => {
  if (!r) return;
  deleteTargetRegion.value = r;
  isDeleteRegionDialogOpen.value = true;
};

const closeDeleteRegionDialog = () => {
  isDeleteRegionDialogOpen.value = false;
  deleteTargetRegion.value = null;
};

const confirmDeleteRegion = async () => {
  const target = deleteTargetRegion.value;
  closeDeleteRegionDialog();
  if (!target) return;

  const currentUser = $auth.currentUser;
  if (!currentUser) return;

  const uid = currentUser.uid;
  const dropKey = regionEntryKey(target);
  deleteRegionLoading.value = true;
  try {
    const next = userRegions.value.filter((e) => regionEntryKey(e) !== dropKey);
    await updateDoc(doc($db, "userRegions", uid), {
      regions: next,
      updatedAt: new Date(),
    });
    userRegions.value = next;

    const ck = regionCoordKey(target);
    if (ck && !next.some((e) => regionCoordKey(e) === ck)) {
      const { [ck]: _removed, ...rest } = regionLabelByKey.value;
      regionLabelByKey.value = rest;
    }
  } catch {
    alert("지역 삭제에 실패했습니다.");
  } finally {
    deleteRegionLoading.value = false;
  }
};

const openDeleteDeviceDialog = (token: string) => {
  if (!token) return;
  deleteTargetToken.value = token;
  isDeleteDeviceDialogOpen.value = true;
};

const closeDeleteDeviceDialog = () => {
  isDeleteDeviceDialogOpen.value = false;
  deleteTargetToken.value = "";
};

const confirmDeleteDevice = async () => {
  const token = deleteTargetToken.value.trim();
  closeDeleteDeviceDialog();
  if (!token) return;

  const currentUser = $auth.currentUser;
  if (!currentUser) return;

  const uid = currentUser.uid;
  const wasCurrentDevice = currentToken.value === token;
  deleteDeviceLoading.value = true;
  try {
    const refDoc = doc($db, "users", uid);
    const snap = await getDoc(refDoc);
    if (!snap.exists()) return;

    const data: any = snap.data() || {};
    const currentTokens = Array.isArray(data?.fcmTokens) ? data.fcmTokens : [];
    const next = currentTokens.filter((item: any) => getToken(item) !== token);

    await updateDoc(refDoc, { fcmTokens: next });
    fcmTokenEntries.value = next;

    if (wasCurrentDevice) {
      localStorage.removeItem("fcmToken");
      currentToken.value = "";
      await signOut($auth);
      router.push("/");
    }
  } catch {
    alert("디바이스 삭제에 실패했습니다.");
  } finally {
    deleteDeviceLoading.value = false;
  }
};

const toggleDevicePush = async (token: string, enabled: boolean) => {
  const currentUser = $auth.currentUser;
  const uid = currentUser?.uid;
  if (!uid) return;

  try {
    logoutLoading.value = true;
    const refDoc = doc($db, "users", uid);
    const snap = await getDoc(refDoc);
    if (!snap.exists()) return;

    const data: any = snap.data() || {};
    const currentTokens = Array.isArray(data?.fcmTokens) ? data.fcmTokens : [];

    // 요청대로: meta는 건드리지 않고 enabled 값만 변경
    const next = currentTokens.map((item: any) => {
      if (typeof item === "object" && item && typeof item.token === "string" && item.token === token) {
        return {
          ...item,
          enabled,
        };
      }
      return item;
    });

    await updateDoc(refDoc, { fcmTokens: next });
    fcmTokenEntries.value = next;
  } finally {
    logoutLoading.value = false;
  }
};

const openWithdrawDialog = () => {
  isWithdrawDialogOpen.value = true;
};

const closeWithdrawDialog = () => {
  isWithdrawDialogOpen.value = false;
};

const confirmWithdraw = async () => {
  const currentUser = $auth.currentUser;
  if (!currentUser) {
    closeWithdrawDialog();
    return;
  }

  const uid = currentUser.uid;
  withdrawLoading.value = true;
  let firestoreOk = false;
  try {
    const q = query(collection($db, "alarms"), where("uid", "==", uid));
    const alarmSnap = await getDocs(q);
    await Promise.all(alarmSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc($db, "userRegions", uid));
    await deleteDoc(doc($db, "users", uid));
    firestoreOk = true;
  } catch {
    alert("회원탈퇴 처리 중 오류가 발생했습니다.");
  } finally {
    withdrawLoading.value = false;
    closeWithdrawDialog();
  }

  if (!firestoreOk) return;

  try {
    await deleteUser(currentUser);
  } catch {
    await signOut($auth);
  }

  localStorage.removeItem("fcmToken");
  if (typeof window !== "undefined") {
    sessionStorage.setItem("showWithdrawSuccessToast", "1");
  }
  router.push("/");
};

const handleLogout = async () => {
  const currentUser = $auth.currentUser;
  const uid = currentUser?.uid;
  const currentToken = localStorage.getItem("fcmToken") || "";

  try {
    logoutLoading.value = true;

    // 요청대로: 로그아웃해도 Firestore users 문서의 fcmTokens는 그대로 둡니다.
    // 로컬에 저장된 현재 디바이스 토큰만 정리합니다.
    if (currentToken) localStorage.removeItem("fcmToken");

    await signOut($auth);
    router.push("/");
  } finally {
    logoutLoading.value = false;
  }
};

onMounted(() => {
  onAuthStateChanged($auth, async (user) => {
    if (!user) {
      isLoggedIn.value = false;
      userEmail.value = "";
      userName.value = "";
      fcmTokenEntries.value = [];
      userRegions.value = [];
      regionLabelByKey.value = {};
      regionAddressLoading.value = false;
      currentToken.value = "";
      return;
    }

    isLoggedIn.value = true;
    userEmail.value = user.email ?? "";
    currentToken.value = localStorage.getItem("fcmToken") || "";

    // Firestore `users` 문서의 name을 우선 사용
    try {
      const refDoc = doc($db, "users", user.uid);
      const snap = await getDoc(refDoc);
      if (snap.exists()) {
        const data: any = snap.data();
        userName.value = data?.name ?? user.displayName ?? "";

        console.log("data", data?.fcmTokens);
        // 요청대로: 여기서 가공/머지하지 말고 DB의 fcmTokens를 그대로 화면에 표시
        fcmTokenEntries.value = Array.isArray(data?.fcmTokens) ? data.fcmTokens : [];
      } else {
        userName.value = user.displayName ?? "";
        fcmTokenEntries.value = [];
      }
    } catch {
      userName.value = user.displayName ?? "";
      fcmTokenEntries.value = [];
    }

    try {
      const regSnap = await getDoc(doc($db, "userRegions", user.uid));
      if (regSnap.exists()) {
        const rdata: any = regSnap.data();
        userRegions.value = Array.isArray(rdata?.regions) ? rdata.regions : [];
      } else {
        userRegions.value = [];
      }
    } catch {
      userRegions.value = [];
    }

    await fetchRegionLabels(userRegions.value);
  });
});
</script>

<style>
.account-page {
  min-height: calc(100vh - 164px);
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

.account-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel {
  width: 100%;
  background: #ffffffd9;
  backdrop-filter: blur(4px);
  border-radius: 24px;
  box-shadow: 0 12px 30px rgba(29, 76, 122, 0.2);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 10px;
  border-bottom: 1px solid rgba(23, 68, 109, 0.14);
}

.panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 900;
  color: #17446d;
}

.panel-body {
  padding: 14px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row {
  margin: 0;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 16px;
  background: #ffffffcc;
  border: 1px solid #d8e7f3;
}

.label {
  font-size: 13px;
  font-weight: 800;
  color: #17446d;
}

.value {
  font-size: 13px;
  font-weight: 700;
  color: #4b5b6a;
  text-align: right;
  word-break: break-word;
}

.hint {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #4c6f8f;
}

.actions-panel .panel-body {
  gap: 10px;
}

.actions-body {
  align-items: stretch;
}

.logout-btn {
  padding: 12px 14px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #2c83c9 0%, #17446d 100%);
  color: white;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 14px rgba(44, 131, 201, 0.4);
}

.logout-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(44, 131, 201, 0.5);
}

.logout-btn:active:not(:disabled) {
  transform: translateY(0);
}

.logout-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.withdraw-link {
  padding: 0;
  border: none;
  background: none;
  font-size: 13px;
  font-weight: 700;
  color: #8a96a3;
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.2s;
}

.withdraw-link:hover:not(:disabled) {
  color: #b91c1c;
}

.withdraw-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.regions-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.region-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: #ffffffcc;
  border: 1px solid #d8e7f3;
  font-size: 13px;
}

.region-address {
  flex: 1;
  min-width: 0;
  font-weight: 800;
  color: #17446d;
  line-height: 1.45;
  word-break: keep-all;
}

.region-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.region-saved {
  font-size: 12px;
  color: #6b8399;
}

.region-remove-btn {
  flex: 0 0 auto;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #8a96a3;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition:
    background 0.15s,
    color 0.15s;
}

.region-remove-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.06);
  color: #b91c1c;
}

.region-remove-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.region-remove-icon {
  width: 14px;
  height: 14px;
}

.tokens-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.token-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 40px 10px 12px;
  border-radius: 16px;
  background: #ffffffcc;
  border: 1px solid #d8e7f3;
  position: relative;
}

.token-item.current {
  background: #f0fbff;
  box-shadow: 0 8px 24px rgba(44, 131, 201, 0.18);
}

.device-toggle-btn {
  flex: 0 0 auto;
  padding: 7px 10px;
  border-radius: 999px;
  border: none;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.2s;
  background: #edf2f6;
  color: #4b5b6a;
}

.device-toggle-btn.on {
  background: #d9f0ff;
  color: #17446d;
}

.device-toggle-btn:not(.on) {
  background: #ffe9e9;
  color: #b91c1c;
}

/* X 버튼은 우측 상단 */
.token-remove-btn {
  position: absolute;
  top: 8px;
  left: auto;
  right: 8px;
  z-index: 2;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #8a96a3;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition:
    background 0.15s,
    color 0.15s;
}

.token-remove-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.06);
  color: #b91c1c;
}

.token-remove-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.token-remove-icon {
  width: 16px;
  height: 16px;
}

.token-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.token-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-line {
  margin: 0;
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.meta-key {
  flex: 0 0 auto;
  width: 56px;
  font-size: 12px;
  font-weight: 900;
  color: #17446d;
}

.meta-val {
  flex: 1 1 auto;
  font-size: 12px;
  font-weight: 700;
  color: #4b5b6a;
  word-break: break-word;
}

.meta-json {
  margin: 0;
  padding: 10px 12px;
  border-radius: 14px;
  background: #ffffffcc;
  border: 1px solid #d8e7f3;
  font-size: 11px;
  font-weight: 700;
  color: #4b5b6a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 160px;
  overflow: auto;
}

.back-btn {
  padding: 12px 14px;
  border-radius: 999px;
  border: none;
  background: #edf2f6;
  color: #4b5b6a;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
}

.back-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .account-page {
    padding: 16px;
  }
}
</style>
