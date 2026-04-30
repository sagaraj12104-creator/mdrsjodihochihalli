import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCIeOjLwaNgEv-aecTzm0VKloYR6OOITUM",
  authDomain: "mdrs-470bb.firebaseapp.com",
  projectId: "mdrs-470bb",
  storageBucket: "mdrs-470bb.firebasestorage.app",
  messagingSenderId: "1072027515352",
  appId: "1:1072027515352:web:59158037519acdf21ddaad",
  measurementId: "G-96E8ZY996P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
