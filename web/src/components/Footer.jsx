import { Link } from 'react-router-dom';
import { useConsent } from '../hooks/useConsent.jsx';
import { useI18n } from '../hooks/useI18n.jsx';
import LangSwitch from './LangSwitch.jsx';

export default function Footer() {
  const { t } = useI18n();
  const { rouvrir } = useConsent();
  return (
    <footer className="pk-footer">
      <div>{t.footer_credit}</div>
      <nav className="pk-footer-links" aria-label="Liens légaux">
        <Link to="/cgu">{t.cgu}</Link>
        <Link to="/confidentialite">{t.privacy}</Link>
        <Link to="/mentions-legales">{t.legal}</Link>
        <button type="button" onClick={rouvrir}>
          {t.cookies}
        </button>
        <LangSwitch />
      </nav>
    </footer>
  );
}
