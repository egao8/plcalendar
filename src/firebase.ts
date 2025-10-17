import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDW0g1738Hqwsh7bK9QEs19M4qr4TBKplw",
  authDomain: "plcalendar-92d2c.firebaseapp.com",
  projectId: "plcalendar-92d2c",
  storageBucket: "plcalendar-92d2c.firebasestorage.app",
  messagingSenderId: "371138490039",
  appId: "1:371138490039:web:1410cc3891d8aa853ae732",
  measurementId: "G-CN12LN8WQ6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

