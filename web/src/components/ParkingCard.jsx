import { useI18n } from '../hooks/useI18n.jsx';
import { etatParking, fmtNombre } from '../lib/format.js';
import { interpoler, libelleAffichage } from '../lib/i18n.js';

const COULEUR = { good: 'var(--good)', warn: 'var(--warn)', crit: 'var(--crit)', closed: 'var(--closed)' };

function Tendance({ delta }) {
  if (delta === null || delta === undefined) return null;
  if (delta === 0) return <span className="trend flat">–</span>;
  return delta > 0 ? <span className="trend up">▲ {delta}</span> : <span className="trend down">▼ {Math.abs(delta)}</span>;
}

export default function ParkingCard({ parking, rang, tendance, actif, onSelect, cardRef }) {
  const { t } = useI18n();
  const { nom, places, capacite, statut, timestamp } = parking;
  const affichage = libelleAffichage(parking.affichage, t);
  const etat = etatParking(statut, places, capacite);
  const pct = capacite ? Math.round((places / capacite) * 100) : 0;
  const complet = etat !== 'closed' && parking.affichage === 'COMPLET';
  const chip = etat === 'closed' ? affichage : complet ? t.card_full : t[`state_${etat}`];
  return (
    <button type="button" ref={cardRef} className={`card pcard${actif ? ' active' : ''}`} onClick={() => onSelect(nom)} aria-pressed={actif}>
      <span className="pcard-name">
        <span className="rank">{rang}</span>
        {nom}
        <span className={`chip ${etat}`}>{chip}</span>
      </span>
      {etat === 'closed' ? (
        <>
          <span className="pcard-count num">
            <small>{affichage}</small>
          </span>
          <span className="meta">
            <span>
              {t.card_updated} {timestamp}
            </span>
            <span>—</span>
          </span>
        </>
      ) : (
        <>
          <span className="pcard-count num">
            {fmtNombre(places)} <small>/ {fmtNombre(capacite)}</small>
          </span>
          <span className="bar" role="img" aria-label={interpoler(t.pct_free, { pct })}>
            <i style={{ width: `${Math.max(3, pct)}%`, background: COULEUR[etat] }} />
          </span>
          <span className="meta">
            <span>
              {t.card_updated} {timestamp}
              {tendance !== null && tendance !== undefined && (
                <>
                  {' · '}
                  <Tendance delta={tendance} /> {t.per30}
                </>
              )}
            </span>
            <span className="num">{interpoler(t.pct_free, { pct })}</span>
          </span>
        </>
      )}
    </button>
  );
}
