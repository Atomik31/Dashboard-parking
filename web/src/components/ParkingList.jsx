import { PARKINGS } from '../../shared/config.js';
import { fmtNombre, synthese } from '../lib/format.js';
import ParkingCard from './ParkingCard.jsx';

/* Tuiles d'indicateurs + liste des cartes (parkings déjà triés). */
export default function ParkingList({ parkings }) {
  const s = synthese(parkings);
  return (
    <div className="pk-list">
      <div className="pk-tiles">
        <div className="pk-tile">
          <div className="pk-label">Places libres</div>
          <div className="pk-value">{fmtNombre(s.libres)}</div>
          <div className="pk-sub">tous parcs</div>
        </div>
        <div className="pk-tile">
          <div className="pk-label">Ouverts</div>
          <div className="pk-value">
            {s.nbOuverts}/{PARKINGS.length}
          </div>
          <div className="pk-sub">en service</div>
        </div>
        <div className="pk-tile">
          <div className="pk-label">Occupation</div>
          <div className="pk-value">{s.occupation}</div>
          <div className="pk-sub">moyenne</div>
        </div>
      </div>
      <div className="pk-section">Parkings, du plus disponible au plus rempli</div>
      {parkings.map(p => (
        <ParkingCard key={p.nom} parking={p} />
      ))}
    </div>
  );
}
