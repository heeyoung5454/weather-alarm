import { ref, computed } from "vue";
import { collection, getDocs } from "firebase/firestore";

type RegionDoc = {
  name: string;
  x: number;
  y: number;
  lat: number;
  lon: number;
};

const regionsState = ref<RegionDoc[] | null>(null);
const loadingState = ref(false);
const errorState = ref<string | null>(null);

export const useRegions = () => {
  const { $db } = useNuxtApp();

  const fetchRegions = async () => {
    if (regionsState.value && regionsState.value.length) return regionsState.value;

    loadingState.value = true;
    errorState.value = null;

    try {
      const snapshot = await getDocs(collection($db, "regions"));
      regionsState.value = snapshot.docs.map((d) => {
        const data = d.data() as any;
        return {
          name: data.name ?? d.id,
          x: data.x,
          y: data.y,
          lat: data.lat,
          lon: data.lon,
        } as RegionDoc;
      });
      return regionsState.value;
    } catch (e: any) {
      console.error("Failed to load regions:", e);
      errorState.value = e?.message ?? "지역 정보를 불러오지 못했습니다.";
      return [];
    } finally {
      loadingState.value = false;
    }
  };

  const regionsByName = computed<Record<string, RegionDoc>>(() => {
    const map: Record<string, RegionDoc> = {};
    (regionsState.value ?? []).forEach((r) => {
      map[r.name] = r;
    });
    return map;
  });

  return {
    regions: regionsState,
    regionsByName,
    loading: loadingState,
    error: errorState,
    fetchRegions,
  };
};

