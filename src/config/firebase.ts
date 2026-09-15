import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

/**
 * Firebase Web App config — get these from:
 * Firebase Console -> Project Settings -> General -> "Your apps" -> Web app.
 *
 * Set them in fanitt-web/.env as:
 *   VITE_FIREBASE_API_KEY=
 *   VITE_FIREBASE_AUTH_DOMAIN=
 *   VITE_FIREBASE_PROJECT_ID=
 *   VITE_FIREBASE_APP_ID=
 *
 * These are safe to expose in frontend code (they identify the project,
 * they don't grant access on their own) — but Google Sign-In still only
 * works for domains you've added under Authentication -> Settings ->
 * Authorized domains in the Firebase console (add "localhost" for dev).
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const app = firebaseEnabled ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();

if (auth) {
  // Required for signInWithRedirect's result to reliably survive the
  // full-page navigation to Google and back, in browsers that partition or
  // restrict default storage for cross-site auth flows.
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error('[firebase] Failed to set auth persistence:', err);
  });
}
