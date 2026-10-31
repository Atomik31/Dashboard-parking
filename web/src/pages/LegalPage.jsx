import { Link } from 'react-router-dom';
import { useI18n } from '../hooks/useI18n.jsx';
import { LEGAL_PAGES, MAJ_LEGAL } from '../lib/legal.js';

export default function LegalPage({ page }) {
  const { t, lang } = useI18n();
  const doc = LEGAL_PAGES[page];
  return (
    <main className="pk-legal" lang="fr">
      <Link to="/" className="pk-link">
        ← {t.back}
      </Link>
      <h1>{doc.title}</h1>
      <p className="pk-legal-meta">
        {t.last_update} : {MAJ_LEGAL}
        {lang === 'en' && <> — {t.legal_fr_only}</>}
      </p>
      {doc.sections.map(s => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.p.map(par => (
            <p key={par}>{par}</p>
          ))}
        </section>
      ))}
    </main>
  );
}
