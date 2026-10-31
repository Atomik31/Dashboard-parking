import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANGS, MESSAGES, detecterLangue } from '../lib/i18n.js';
import { ecrireLocal, lireLocal } from '../lib/storage.js';

const CLE = 'pk_lang';
const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const stocke = lireLocal(CLE);
    return LANGS.includes(stocke) ? stocke : detecterLangue();
  });
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback(l => {
    if (!LANGS.includes(l)) return;
    setLangState(l);
    ecrireLocal(CLE, l);
  }, []);
  const value = useMemo(() => ({ lang, setLang, t: MESSAGES[lang] }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
