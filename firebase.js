// firebase.js
import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCf3aiquXQ0DdjpRmp4NPCCWswlOuhXQs4",
  authDomain: "mosque-services-app.firebaseapp.com",
  projectId: "mosque-services-app",
  storageBucket: "mosque-services-app.appspot.com",
  messagingSenderId: "66306776073",
  appId: "1:66306776073:web:f0d305558c87becc572cd8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

/**
 * Auth initialization is platform-dependent:
 *
 * - WEB: `firebase/auth` resolves to its BROWSER build, which does NOT export
 *   `getReactNativePersistence`. Calling it crashed Expo web with
 *   `(0, _auth.getReactNativePersistence) is not a function` at firebase.js:24.
 *   On web we use the standard `getAuth()`, which persists sessions in
 *   IndexedDB/localStorage by default.
 *
 * - NATIVE (iOS/Android): `firebase/auth` resolves to its react-native build
 *   where `getReactNativePersistence(AsyncStorage)` gives persistent sessions.
 *
 * The try/catch handles Fast Refresh / hot reload, where this module runs
 * again after auth was already initialized (`auth/already-initialized`).
 */
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if (error?.code === 'auth/already-initialized') {
      auth = getAuth(app);
    } else {
      throw error;
    }
  }
}

// Initialize Firestore
export const db = getFirestore(app);

export { auth };
export default app;
