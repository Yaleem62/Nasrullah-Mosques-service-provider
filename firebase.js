// Import the functions you need from the Firebase SDKs
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCf3aiquXQ0DdjpRmp4NPCCWswlOuhXQs4",
  authDomain: "mosque-services-app.firebaseapp.com",
  projectId: "mosque-services-app",
  storageBucket: "mosque-services-app.appspot.com", // Corrected storageBucket
  messagingSenderId: "66306776073",
  appId: "1:66306776073:web:f0d305558c87becc572cd8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;