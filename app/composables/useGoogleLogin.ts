import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export const useGoogleLogin = async () => {
  const { $auth } = useNuxtApp();

  const provider = new GoogleAuthProvider();

  const result = await signInWithPopup($auth, provider);

  const user = result.user;

  console.log("로그인 성공:", user);

  return user;
};
