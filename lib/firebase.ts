import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDD6f78GSw_su-JlB6wfnQ1w0_M03ScSvU",
  authDomain: "outtt-480eb.firebaseapp.com",
  projectId: "outtt-480eb",
  storageBucket: "outtt-480eb.firebasestorage.app",
  messagingSenderId: "886309342845",
  appId: "1:886309342845:web:e4881370c5da77ace82b14",
  measurementId: "G-W297FZGS5K"
};

// Initialize Firebase (prevent re-initialization in Next.js fast refresh)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

let messaging: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}

export { app, auth, messaging };
