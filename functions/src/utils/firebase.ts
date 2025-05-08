import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let app;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    console.log(
      "❌ Firebase Admin not initialized FIREBASE_SERVICE_ACCOUNT is not defined"
    );
    app = initializeApp();
  }
} catch (error) {
  console.error("❌ Error initializing Firebase Admin:", error);
  throw error;
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Collection names used across the application
export const collections = {
  users: "users",
  menfess: "menfessPosts",
  interactions: "interactions",
  reports: "reports",
  sessions: "sessions",
};
