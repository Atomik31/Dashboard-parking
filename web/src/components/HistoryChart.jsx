import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COULEURS_SERIES, PARKINGS, PLAGES_HISTORIQUE } from '../../shared/config.js';
import { useHistory } from '../hooks/useHistory.js';
import { cleJour, fmtHeure, graduations, fmtJour, fmtJourHeure, occupationPct, pivoterHistorique } from '../lib/format.js';
import Loader from './Loader.jsx';
import MultiSelect from './MultiSelect.jsx';
import SegmentedControl from './SegmentedControl.jsx';

const NOMS = PARKINGS.map(p => p.nom);
const COULEUR = Object.fromEntries(PARKINGS.map((p, i) => [p.nom, COULEURS_SERIES[i]]));
const PLAGES = Object.entries(PLAGES_HISTORIQUE).map(([label, value]) => ({ label, value }));
const MESURES = [
  { label: 'Places libres', value: 'libres' },
  { label: 'Occupation (%)', value: 'occupation' }
];

function InfoBulle({ active, payload, label, unite }) {
  if (!active || !payload?.length) return null;
  const lignes = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return (
    <div className="pk-tip">
      <div className="pk-tip-title">{fmtJourHeure(label)}</div>
      {lignes.map(l => (
        <div className="pk-tip-row" key={l.dataKey}>
          <span>
            <i style={{ background: l.color }} />
            {l.name}
          </span>
          <b>
            {l.value}
            {unite}
          </b>
        </div>
      ))}
    </div>
  );
}

export default function HistoryChart() {
  const [heures, setHeures] = useState(PLAGES_HISTORIQUE['6 h']);
  const [mesure, setMesure] = useState('libres');
  const [selection, setSelection] = useState(NOMS);
  const { rows, loading } = useHistory(heures);

  const donnees = useMemo(() => (rows ? pivoterHistorique(rows, selection, mesure, occupationPct) : []), [rows, selection, mesure]);
  const unite = mesure === 'occupation' ? ' %' : '';

  /* Axe X : graduations régulières alignées sur l'heure de Paris ; la date apparaît sur une seconde ligne au changement de jour */
  const ticks = useMemo(() => graduations(donnees, heures), [donnees, heures]);
  const tickX = ({ x, y, payload }) => {
    const ms = payload.value;
    const i = ticks.indexOf(ms);
    const afficherDate = i === 0 || (i > 0 && cleJour(ms) !== cleJour(ticks[i - 1]));
    return (
      <g transform={`translate(${x},${y})`}>
        <text dy={16} textAnchor="middle" fill="#898781" fontSize={12}>
          {fmtHeure(ms)}
        </text>
        {afficherDate && (
          <text dy={32} textAnchor="middle" fill="#898781" fontSize={12}>
            {fmtJour(ms)}
          </text>
        )}
      </g>
    );
  };

  let contenu;
  if (rows && rows.length === 0) {
    contenu = (
      <div className="pk-info">
        Aucun historique disponible pour le moment. Il se construit automatiquement toutes les 10 minutes via le job planifié (voir le README, section Historique S3).
      </div>
    );
  } else if (selection.length === 0) {
    contenu = <div className="pk-info">Sélectionne au moins un parking pour afficher l'historique.</div>;
  } else if (rows) {
    contenu = (
      <div className="pk-chart" aria-label="Historique d'occupation des parkings">
        <ResponsiveContainer width="100%" height={420}>
          <LineChart data={donnees} margin={{ top: 10, right: 10, bottom: 18, left: 10 }}>
            <CartesianGrid stroke="#3d3d43" vertical={false} />
            <XAxis dataKey="ms" type="number" scale="time" domain={['dataMin', 'dataMax']} ticks={ticks} tick={tickX} stroke="#3d3d43" tickLine={false} height={46} />
            <YAxis
              domain={mesure === 'occupation' ? [0, 100] : [0, 'auto']}
              stroke="#3d3d43"
              tick={{ fill: '#898781', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={58}
              label={{ value: mesure === 'occupation' ? 'Occupation (%)' : 'Places libres', angle: -90, position: 'insideLeft', fill: '#c3c2b7', fontSize: 13, style: { textAnchor: 'middle' } }}
            />
            <Tooltip content={<InfoBulle unite={unite} />} cursor={{ stroke: '#898781', strokeDasharray: '3 3' }} isAnimationActive={false} />
            <Legend verticalAlign="top" align="center" height={36} iconType="plainline" wrapperStyle={{ color: '#c3c2b7', fontSize: 12.5 }} />
            {NOMS.filter(n => selection.includes(n)).map(nom => (
              <Line key={nom} type="monotone" dataKey={nom} name={nom} stroke={COULEUR[nom]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <section>
      <div className="pk-section pk-section-lg">Historique d'occupation</div>
      <div className="pk-controls">
        <SegmentedControl label="Période" options={PLAGES} value={heures} onChange={setHeures} />
        <SegmentedControl label="Mesure" options={MESURES} value={mesure} onChange={setMesure} />
      </div>
      <MultiSelect label="Parkings affichés" options={NOMS} value={selection} onChange={setSelection} />
      {contenu}
      {loading && <Loader message="Chargement de l'historique..." />}
    </section>
  );
}
