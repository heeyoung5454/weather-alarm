importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDnqS310rQOzSdMFcP2vzTDHmCWQ6MutFI",
  authDomain: "weatheralarm-155bf.firebaseapp.com",
  projectId: "weatheralarm-155bf",
  messagingSenderId: "222036308741",
  appId: "1:222036308741:web:a4d9bfa6d0aec7ca63fd6c",
});

const messaging = firebase.messaging();

// 백그라운드 푸시 수신
messaging.onBackgroundMessage((payload) => {
  console.log("Background message:", payload);

  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon.png",

    // 🔑 클릭 시 이동할 URL
    data: {
      url: payload.data?.url || "https://weatheralarm-155bf.web.app",
    },
  });
});

// 알림 클릭 이벤트
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 탭 있으면 그 탭으로 이동
      for (const client of clientList) {
        if (client.url.includes("weatheralarm") && "focus" in client) {
          client.focus();
          return client.navigate(url);
        }
      }

      // 없으면 새 창 열기
      return clients.openWindow(url);
    })
  );
});
