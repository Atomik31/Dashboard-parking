import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { AUTH_DEV_MODE, firebaseConfigured, getFirebaseAuth } from '../lib/firebase.js';
import { apiFetch } from '../lib/api.js';
import { ecrireLocal, lireLocal } from '../lib/storage.js';
import { useI18n } from './useI18n.jsx';

const AuthContext = createContext(null);
const DEV_USER = { uid: 'dev-user', email: 'dev@localhost.test', getIdToken: async () => 'dev-bypass' };
const cleFlag = uid => `pk_signup_ok_${uid}`;

export function AuthProvider({ children }) {
  const { lang } = useI18n();
  const [user, setUser] = useState(AUTH_DEV_MODE ? DEV_USER : null);
  const [ready, setReady] = useState(AUTH_DEV_MODE);
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    if (AUTH_DEV_MODE) return undefined;
    const auth = getFirebaseAuth();
    if (!auth) {
      setReady(true);
      return undefined;
    }
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setReady(true);
    });
  }, []);

  const getToken = useCallback(async () => (user ? user.getIdToken() : null), [user]);

  /* Enregistrement du compte dans Airtable (via le serveur). Flag local : réessayé à la prochaine connexion si ça échoue. */
  const uid = user?.uid;
  useEffect(() => {
    if (!uid || AUTH_DEV_MODE || lireLocal(cleFlag(uid))) return;
    let annule = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        await apiFetch('/api/signup', { method: 'POST', token, body: { lang: langRef.current } });
        if (!annule) ecrireLocal(cleFlag(uid), '1');
      } catch {
        /* facultatif : sera retenté à la prochaine connexion */
      }
    })();
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const actions = useMemo(() => {
    const requis = () => {
      const auth = getFirebaseAuth();
      if (!auth) throw Object.assign(new Error('not-configured'), { code: 'app/not-configured' });
      return auth;
    };
    return {
      signInGoogle: () => signInWithPopup(requis(), new GoogleAuthProvider()),
      signInEmail: (email, mdp) => signInWithEmailAndPassword(requis(), email, mdp),
      signUpEmail: (email, mdp) => createUserWithEmailAndPassword(requis(), email, mdp),
      resetPassword: email => sendPasswordResetEmail(requis(), email),
      logout: () => (AUTH_DEV_MODE ? Promise.resolve() : signOut(requis()))
    };
  }, []);

  const value = useMemo(
    () => ({ user, ready, configured: firebaseConfigured || AUTH_DEV_MODE, devMode: AUTH_DEV_MODE, getToken, ...actions }),
    [user, ready, getToken, actions]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
