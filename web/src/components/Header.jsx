import { useAuth } from '../hooks/useAuth.jsx';
import { useI18n } from '../hooks/useI18n.jsx';

export default function Header({ derniereMaj, onActualiser, disabled }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  return (
    <header className="pk-top">
      <div className="pk-header">
        <div className="pk-logo">P</div>
        <div>
          <h1 className="pk-title">Parkings Aix-en-Provence</h1>
          <div className="pk-subtitle">Places disponibles en temps réel</div>
        </div>
        {derniereMaj && (
          <div className="pk-live">
            <span className="pk-dot" />
            Mis à jour à {derniereMaj}
          </div>
        )}
      </div>
      <div className="pk-actions">
        <button type="button" className="pk-btn pk-btn-primary" onClick={onActualiser} disabled={disabled}>
          Actualiser
        </button>
        <button type="button" className="pk-btn pk-btn-ghost" onClick={logout} title={user?.email || ''}>
          {t.logout}
        </button>
      </div>
    </header>
  );
}
