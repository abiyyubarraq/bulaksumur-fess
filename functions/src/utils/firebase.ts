import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// Initialize Firebase Admin
console.log("🔄 Initializing Firebase Admin...");

let app;
try {
  // Use service account or application default credentials
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Use JSON service account if available
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Use application default credentials or emulator if no service account
    app = initializeApp();
  }

  console.log("✅ Firebase Admin initialized successfully");
} catch (error) {
  console.error("❌ Error initializing Firebase Admin:", error);
  throw error;
}

// Export the initialized services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Define common Firestore collections
export const collections = {
  menfess: "menfess",
  users: "users",
  interactions: "interactions",
  reports: "reports",
};
