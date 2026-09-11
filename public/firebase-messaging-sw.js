importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDD6f78GSw_su-JlB6wfnQ1w0_M03ScSvU",
  authDomain: "outtt-480eb.firebaseapp.com",
  projectId: "outtt-480eb",
  storageBucket: "outtt-480eb.firebasestorage.app",
  messagingSenderId: "886309342845",
  appId: "1:886309342845:web:e4881370c5da77ace82b14",
  measurementId: "G-W297FZGS5K"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/logo/outflank-logo.png', // Or any notification icon
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
