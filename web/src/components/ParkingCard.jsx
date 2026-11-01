import { LIBELLES_ETAT, etatParking, fmtNombre } from '../lib/format.js';

const COULEUR = { good: 'var(--good)', warn: 'var(--warn)', crit: 'var(--crit)', closed: 'var(--closed)' };

function Tendance({ delta }) {
  if (delta === null || delta === undefined) return null;
  if (delta === 0) return <span className="trend flat">–</span>;
  return delta > 0 ? <span className="trend up">▲ {delta}</span> : <span className="trend down">▼ {Math.abs(delta)}</span>;
}

export default function ParkingCard({ parking, rang, tendance, actif, onSelect, cardRef }) {
  const { nom, places, capacite, statut, affichage, timestamp } = parking;
  const etat = etatParking(statut, places, capacite);
  const pct = capacite ? Math.round((places / capacite) * 100) : 0;
  const complet = etat !== 'closed' && affichage === 'COMPLET';
  const chip = etat === 'closed' ? affichage : complet ? 'Complet' : LIBELLES_ETAT[etat];
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
            <span>MAJ {timestamp}</span>
            <span>—</span>
          </span>
        </>
      ) : (
        <>
          <span className="pcard-count num">
            {fmtNombre(places)} <small>/ {fmtNombre(capacite)}</small>
          </span>
          <span className="bar" role="img" aria-label={`${pct} % de places libres`}>
            <i style={{ width: `${Math.max(3, pct)}%`, background: COULEUR[etat] }} />
          </span>
          <span className="meta">
            <span>
              MAJ {timestamp}
              {tendance !== null && tendance !== undefined && (
                <>
                  {' · '}
                  <Tendance delta={tendance} /> / 30 min
                </>
              )}
            </span>
            <span className="num">{pct} % libres</span>
          </span>
        </>
      )}
    </button>
  );
}
