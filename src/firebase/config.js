// firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";


const firebaseConfig = {
  apiKey: "AIzaSyBoJqqrgDXYNXICEyDEgxEs0riblloIlqc",
  authDomain: "trip-calculator-72cb6.firebaseapp.com",
  projectId: "trip-calculator-72cb6",
  storageBucket: "trip-calculator-72cb6.firebasestorage.app",
  messagingSenderId: "602245758362",
  appId: "1:602245758362:web:4ef9a3cfd28d537e518e23",
  measurementId: "G-J46SV89TLC"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics only works in the browser
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { analytics };
export default app;
