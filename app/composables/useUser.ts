import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export const saveUser = async (user: any, token: string) => {
  const { $db } = useNuxtApp();

  const ref = doc($db, "users", user.uid);

  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      email: user.email,
      name: user.displayName,
      fcmToken: token,
      pushEnabled: false,
      createdAt: new Date(),
    });

    console.log("새 사용자 생성");
  } else {
    await updateDoc(ref, {
      fcmToken: token,
    });

    console.log("기존 사용자 토큰 업데이트");
  }
};
