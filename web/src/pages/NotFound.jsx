import { Link } from 'react-router-dom';
import { useI18n } from '../hooks/useI18n.jsx';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main className="legal nf">
      <div className="logo">P</div>
      <h1>404 — {t.not_found_title}</h1>
      <p>{t.not_found_text}</p>
      <Link to="/" className="btn btn-primary">
        {t.back_home}
      </Link>
    </main>
  );
}
