// firebase.ts (or firebase.js)

// Import the functions you need
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCf3aiquXQ0DdjpRmp4NPCCWswlOuhXQs4",
  authDomain: "mosque-services-app.firebaseapp.com",
  projectId: "mosque-services-app",
  storageBucket: "mosque-services-app.appspot.com",
  messagingSenderId: "66306776073",
  appId: "1:66306776073:web:f0d305558c87becc572cd8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Initialize Firebase Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore
export const db = getFirestore(app);

export default app;
