import { useAuth } from '../hooks/useAuth.jsx';
import { useI18n } from '../hooks/useI18n.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import UserMenu from './UserMenu.jsx';

export default function Topbar({ derniereMaj, onActualiser, disabled }) {
  const { user } = useAuth();
  const { t } = useI18n();
  return (
    <header className="topbar">
      <div className="wrap topbar-inner">
        <a className="brand" href="/" aria-label={t.app_name}>
          <span className="logo" aria-hidden="true">
            P
          </span>
          <span>
            <span className="brand-title">Parkings Aix-en-Provence</span>
            <br />
            <span className="brand-sub">Places disponibles en temps réel</span>
          </span>
        </a>
        <span className="spacer" />
        {derniereMaj && (
          <span className="live">
            <span className="dot" aria-hidden="true" />
            <span>Mis à jour à {derniereMaj}</span>
          </span>
        )}
        <button type="button" className="btn btn-primary" onClick={onActualiser} disabled={disabled}>
          Actualiser
        </button>
        <ThemeToggle />
        <UserMenu email={user?.email} />
      </div>
    </header>
  );
}
