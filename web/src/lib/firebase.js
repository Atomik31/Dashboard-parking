/* Initialisation Firebase (SDK modulaire). La config vient des variables VITE_FIREBASE_* (publiques par nature). */
import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';

const env = import.meta.env;

export const FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

export const firebaseConfigured = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.authDomain && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId);

/* Mode développement : uniquement avec le serveur Vite (import.meta.env.DEV est faux dans un build de production). */
export const AUTH_DEV_MODE = Boolean(env.DEV) && env.VITE_AUTH_MODE === 'dev';

let auth = null;
export function getFirebaseAuth() {
  if (!firebaseConfigured) return null;
  if (!auth) {
    const app = initializeApp(FIREBASE_CONFIG);
    auth = getAuth(app);
    /* Session conservée dans le navigateur : l'utilisateur reste connecté aux visites suivantes */
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  }
  return auth;
}
