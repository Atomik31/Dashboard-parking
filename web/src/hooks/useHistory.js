import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { useAuth } from './useAuth.jsx';

export function useHistory(heures) {
  const { getToken } = useAuth();
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const token = await getToken();
        const res = await apiFetch(`/api/history?hours=${heures}`, { token, signal: ctrl.signal });
        setRows(res.rows);
      } catch (e) {
        if (e.name !== 'AbortError') {
          setRows([]);
          setError("Impossible de charger l'historique.");
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [heures, getToken]);

  return { rows, loading, error };
}
