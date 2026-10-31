import { COULEURS_ETAT, LIBELLES_ETAT, etatParking, fmtNombre } from '../lib/format.js';

export default function ParkingCard({ parking }) {
  const { nom, places, capacite, statut, affichage, timestamp } = parking;
  const etat = etatParking(statut, places, capacite);
  let chip;
  let corps;
  let pctLibres = '';
  if (etat === 'closed') {
    chip = affichage;
    corps = (
      <div className="pk-places">
        <span className="pk-cap">{affichage}</span>
      </div>
    );
  } else {
    const pct = Math.round((places / capacite) * 100);
    chip = affichage === 'COMPLET' ? 'Complet' : LIBELLES_ETAT[etat];
    pctLibres = `${pct} % libres`;
    corps = (
      <>
        <div className="pk-places">
          <span className="pk-big">{places}</span>
          <span className="pk-cap">/ {fmtNombre(capacite)} places</span>
        </div>
        <div className="pk-bar">
          <i style={{ width: `${Math.max(3, pct)}%`, background: COULEURS_ETAT[etat] }} />
        </div>
      </>
    );
  }
  return (
    <article className="pk-card">
      <div className="pk-card-top">
        <span className="pk-name">{nom}</span>
        <span className={`pk-chip ${etat}`}>{chip}</span>
      </div>
      {corps}
      <div className="pk-meta">
        <span>MAJ {timestamp}</span>
        <span>{pctLibres}</span>
      </div>
    </article>
  );
}
