import { useEffect, useState } from 'react';
import { STATUT_OUVERT } from '../../shared/config.js';
import { apiFetch } from '../lib/api.js';

const RAFRAICHISSEMENT_MS = 5 * 60 * 1000;

/* Parkings ouverts (du plus disponible au moins disponible) pour la page de connexion, sans authentification.
   null tant que non chargé ou en cas d'échec : l'appelant affiche alors son repli. */
export function useApercuPublic() {
  const [parkings, setParkings] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const charger = async () => {
      try {
        const res = await apiFetch('/api/public/live', { signal: ctrl.signal });
        const ouverts = (res.parkings ?? []).filter(p => p.statut === STATUT_OUVERT && p.capacite > 0).sort((a, b) => b.places - a.places);
        setParkings(ouverts.length ? ouverts : null);
      } catch (e) {
        if (e.name !== 'AbortError') setParkings(null);
      }
    };
    charger();
    const timer = setInterval(charger, RAFRAICHISSEMENT_MS);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, []);

  return parkings;
}
