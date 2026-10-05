/*
  Firebase connection for the Zadix site and admin panel.
  Paste the values from: Firebase Console → Project settings → Your apps → Web app → SDK setup (Config).
  See ADMIN-SETUP.md for the full step-by-step guide.
  These values are safe to publish — access is controlled by firestore.rules, not by hiding this file.
*/
export const firebaseConfig = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID",
};

export const isConfigured = !firebaseConfig.apiKey.startsWith("PASTE");

export const FIREBASE_VERSION = "10.12.2";
export const FIREBASE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
