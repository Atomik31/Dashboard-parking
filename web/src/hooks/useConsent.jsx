import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { enregistrerConsentement, lireConsentement } from '../lib/consent.js';

const ConsentContext = createContext(null);

/* Aucun traceur non essentiel n'est chargé par l'application : le choix est simplement mémorisé 12 mois
   (et exposé via `consent` pour tout futur service optionnel, à n'activer que si consent === 'accepted'). */
export function ConsentProvider({ children }) {
  const [consent, setConsent] = useState(() => lireConsentement());
  const [ouvert, setOuvert] = useState(() => lireConsentement() === null);

  const choisir = useCallback(choix => {
    enregistrerConsentement(choix);
    setConsent(choix);
    setOuvert(false);
  }, []);
  const rouvrir = useCallback(() => setOuvert(true), []);
  const fermer = useCallback(() => setOuvert(false), []);

  const value = useMemo(() => ({ consent, bandeauOuvert: ouvert, choisir, rouvrir, fermer }), [consent, ouvert, choisir, rouvrir, fermer]);
  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export const useConsent = () => useContext(ConsentContext);
