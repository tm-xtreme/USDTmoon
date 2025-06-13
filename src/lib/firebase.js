// Import Firebase core and services
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAMxsru5wYDPQQMflZNuSRovgL3dpSAtsQ",
  authDomain: "moonusdt.firebaseapp.com",
  projectId: "moonusdt",
  storageBucket: "moonusdt.firebasestorage.app",
  messagingSenderId: "250779626021",
  appId: "1:250779626021:web:4a622a9664715963b3adcc",
  measurementId: "G-E8XXHB12L7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export initialized services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
export default app;
