import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";
import { getAuth } from "firebase/auth";

export default defineNuxtPlugin(async () => {
  const firebaseConfig = {
    apiKey: "AIzaSyDnqS310rQOzSdMFcP2vzTDHmCWQ6MutFI",
    authDomain: "weatheralarm-155bf.firebaseapp.com",
    projectId: "weatheralarm-155bf",
    storageBucket: "weatheralarm-155bf.firebasestorage.app",
    messagingSenderId: "222036308741",
    appId: "1:222036308741:web:a4d9bfa6d0aec7ca63fd6c",
    measurementId: "G-36G1BVVBTV",
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  let messaging = null;
  try {
    if (process.client && (await isSupported())) {
      // 🔥 Service Worker 등록
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      }

      messaging = getMessaging(app);
    }
  } catch (e) {
    console.warn("Firebase Messaging init failed:", e);
  }

  return {
    provide: {
      db,
      messaging,
      auth,
    },
  };
});
