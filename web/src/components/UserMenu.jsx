import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useI18n } from '../hooks/useI18n.jsx';
import { initiale } from '../lib/insights.js';

/* Avatar du compte : adresse e-mail et déconnexion. */
export default function UserMenu({ email }) {
  const { logout } = useAuth();
  const { t } = useI18n();
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ouvert) return undefined;
    const fermer = e => {
      if (e.type === 'keydown' ? e.key === 'Escape' : ref.current && !ref.current.contains(e.target)) setOuvert(false);
    };
    document.addEventListener('mousedown', fermer);
    document.addEventListener('keydown', fermer);
    return () => {
      document.removeEventListener('mousedown', fermer);
      document.removeEventListener('keydown', fermer);
    };
  }, [ouvert]);

  return (
    <div className="menu-wrap" ref={ref}>
      <button type="button" className="avatar" aria-haspopup="menu" aria-expanded={ouvert} aria-label={t.my_account} onClick={() => setOuvert(o => !o)}>
        {initiale(email)}
      </button>
      {ouvert && (
        <div className="menu" role="menu">
          {email && <div className="menu-mail">{email}</div>}
          <button type="button" role="menuitem" onClick={logout}>
            {t.logout}
          </button>
        </div>
      )}
    </div>
  );
}
