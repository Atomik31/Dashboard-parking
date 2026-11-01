import { useEffect, useMemo, useRef, useState } from 'react';
import { STATUT_OUVERT } from '../../shared/config.js';
import { etatParking } from '../lib/format.js';
import { tendance30 } from '../lib/insights.js';
import ParkingCard from './ParkingCard.jsx';

const FILTRES = [
  { value: 'tous', label: 'Tous' },
  { value: 'dispo', label: 'Disponibles' },
  { value: 'complets', label: 'Complets / fermés' }
];
const TRIS = {
  dispo: (a, b) => (b.statut === STATUT_OUVERT) - (a.statut === STATUT_OUVERT) || b.places - a.places,
  taux: (a, b) => (b.statut === STATUT_OUVERT) - (a.statut === STATUT_OUVERT) || b.places / b.capacite - a.places / a.capacite,
  nom: (a, b) => a.nom.localeCompare(b.nom, 'fr')
};

const estIndispo = p => p.statut !== STATUT_OUVERT || etatParking(p.statut, p.places, p.capacite) === 'crit';

/* Filtres, tri et liste des parkings. `selection` = { nom, origine } ; un clic sur la carte fait défiler jusqu'à la carte. */
export default function ParkingList({ parkings, historique, selection, onSelect, maintenant }) {
  const [filtre, setFiltre] = useState('tous');
  const [tri, setTri] = useState('dispo');
  const refs = useRef({});

  const visibles = useMemo(() => {
    let l = parkings;
    if (filtre === 'dispo') l = l.filter(p => !estIndispo(p));
    if (filtre === 'complets') l = l.filter(estIndispo);
    return [...l].sort(TRIS[tri]);
  }, [parkings, filtre, tri]);

  useEffect(() => {
    if (selection?.origine === 'carte') refs.current[selection.nom]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selection]);

  return (
    <div>
      <div className="list-head">
        <div className="segmented" role="group" aria-label="Filtrer les parkings">
          {FILTRES.map(f => (
            <button key={f.value} type="button" aria-pressed={filtre === f.value} onClick={() => setFiltre(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="tri-parkings">
          Trier par
        </label>
        <select id="tri-parkings" className="btn" value={tri} onChange={e => setTri(e.target.value)}>
          <option value="dispo">Plus de places</option>
          <option value="taux">Taux de places libres</option>
          <option value="nom">Nom (A–Z)</option>
        </select>
      </div>
      <div className="plist">
        {visibles.map((p, i) => (
          <ParkingCard
            key={p.nom}
            parking={p}
            rang={i + 1}
            tendance={tendance30(historique, p.nom, p.places, maintenant)}
            actif={selection?.nom === p.nom}
            onSelect={nom => onSelect({ nom, origine: 'liste' })}
            cardRef={el => {
              refs.current[p.nom] = el;
            }}
          />
        ))}
        {visibles.length === 0 && <p className="chart-empty">Aucun parking ne correspond à ce filtre.</p>}
      </div>
    </div>
  );
}
