import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

export default defineNuxtPlugin(() => {
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

  return {
    provide: {
      db,
    },
  };
});
