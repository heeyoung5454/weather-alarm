import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

type Coords = { lat: number; lng: number };

export const saveUser = async (user: any, token: string, coords?: Coords) => {
  const { $db } = useNuxtApp();

  const ref = doc($db, "users", user.uid);

  const snapshot = await getDoc(ref);

  const baseData: any = {
    fcmToken: token,
  };

  if (coords) {
    baseData.lat = coords.lat;
    baseData.lng = coords.lng;
  }

  if (!snapshot.exists()) {
    await setDoc(ref, {
      email: user.email,
      name: user.displayName,
      pushEnabled: false,
      createdAt: new Date(),
      ...baseData,
    });

    console.log("새 사용자 생성");
  } else {
    await updateDoc(ref, baseData);

    console.log("기존 사용자 토큰/위치 업데이트");
  }
};

