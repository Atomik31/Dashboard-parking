import { useI18n } from '../hooks/useI18n.jsx';
import { LANGS } from '../lib/i18n.js';

export default function LangSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <span className="lang" role="group" aria-label={t.lang_label}>
      {LANGS.map(l => (
        <button key={l} type="button" className={l === lang ? 'on' : ''} aria-pressed={l === lang} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  );
}
