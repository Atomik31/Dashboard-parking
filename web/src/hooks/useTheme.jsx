import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ecrireLocal, lireLocal, supprimerLocal } from '../lib/storage.js';
import { useConsent } from './useConsent.jsx';

const CLE = 'pk_theme';
const ThemeContext = createContext(null);

function themeInitial() {
  const memorise = lireLocal(CLE);
  if (memorise === 'dark' || memorise === 'light') return memorise;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/* Thème sombre/clair. Le choix n'est mémorisé (localStorage) que si l'utilisateur a accepté le stockage optionnel ;
   sinon il vaut pour la session en cours et la préférence du système sert de défaut. */
export function ThemeProvider({ children }) {
  const { consent } = useConsent();
  const [theme, setTheme] = useState(themeInitial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (consent === 'accepted') ecrireLocal(CLE, theme);
    else supprimerLocal(CLE);
  }, [consent, theme]);

  const basculer = useCallback(() => setTheme(t => (t === 'dark' ? 'light' : 'dark')), []);
  const value = useMemo(() => ({ theme, basculer }), [theme, basculer]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
