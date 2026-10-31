import { Link } from 'react-router-dom';
import { useConsent } from '../hooks/useConsent.jsx';
import { useI18n } from '../hooks/useI18n.jsx';

export default function CookieBanner() {
  const { t } = useI18n();
  const { bandeauOuvert, consent, choisir, fermer } = useConsent();
  if (!bandeauOuvert) return null;
  return (
    <div className="pk-cookie" role="dialog" aria-modal="false" aria-labelledby="ck-title">
      <div>
        <strong id="ck-title">{t.cookie_title}</strong>
        <p>{t.cookie_text}</p>
        {consent && <p className="pk-cookie-state">{consent === 'accepted' ? t.cookie_saved_accept : t.cookie_saved_refuse}</p>}
      </div>
      <div className="pk-cookie-actions">
        <Link to="/confidentialite" onClick={fermer}>
          {t.cookie_more}
        </Link>
        <button type="button" className="pk-btn pk-btn-ghost" onClick={() => choisir('refused')}>
          {t.cookie_refuse}
        </button>
        <button type="button" className="pk-btn pk-btn-primary" onClick={() => choisir('accepted')}>
          {t.cookie_accept}
        </button>
      </div>
    </div>
  );
}
