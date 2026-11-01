import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { useAuth } from './useAuth.jsx';

const RAFRAICHISSEMENT_AUTO_MS = 10 * 60 * 1000;

export function useParkings() {
  const { getToken, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const enCours = useRef(0);

  const charger = useCallback(
    async (forcer = false) => {
      const id = ++enCours.current;
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const res = await apiFetch(forcer ? '/api/refresh' : '/api/parkings', { token, method: forcer ? 'POST' : 'GET' });
        if (id === enCours.current) setData(res);
      } catch (e) {
        if (e.status === 401) logout();
        if (id === enCours.current) setError(e.status === 429 ? 'rate' : 'fetch');
      } finally {
        if (id === enCours.current) setLoading(false);
      }
    },
    [getToken, logout]
  );

  useEffect(() => {
    charger(false);
    const timer = setInterval(() => charger(false), RAFRAICHISSEMENT_AUTO_MS);
    return () => clearInterval(timer);
  }, [charger]);

  return { data, loading, error, actualiser: () => charger(true) };
}
