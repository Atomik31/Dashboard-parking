import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COULEURS_SERIES, PARKINGS, PLAGES_HISTORIQUE } from '../../shared/config.js';
import { useHistory } from '../hooks/useHistory.js';
import { cleJour, fmtHeure, graduations, fmtJour, fmtJourHeure, occupationPct, pivoterHistorique } from '../lib/format.js';
import Loader from './Loader.jsx';
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
    <div className="rtip">
      <div className="rtip-title">{fmtJourHeure(label)}</div>
      {lignes.map(l => (
        <div className="rtip-row" key={l.dataKey}>
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
        <text dy={16} textAnchor="middle" fill="var(--muted)" fontSize={11.5}>
          {fmtHeure(ms)}
        </text>
        {afficherDate && (
          <text dy={32} textAnchor="middle" fill="var(--muted)" fontSize={11.5}>
            {fmtJour(ms)}
          </text>
        )}
      </g>
    );
  };

  let contenu;
  if (rows && rows.length === 0) {
    contenu = (
      <div className="chart-empty">Aucun historique disponible sur cette période pour le moment. Il se construit automatiquement, un relevé toutes les 10 minutes.</div>
    );
  } else if (selection.length === 0) {
    contenu = <div className="chart-empty">Sélectionne au moins un parking pour afficher l'historique.</div>;
  } else if (rows) {
    contenu = (
      <div className="chart-box" role="img" aria-label="Historique d'occupation des parkings">
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={donnees} margin={{ top: 10, right: 12, bottom: 18, left: 4 }}>
            <CartesianGrid stroke="var(--track)" vertical={false} />
            <XAxis dataKey="ms" type="number" scale="time" domain={['dataMin', 'dataMax']} ticks={ticks} tick={tickX} stroke="var(--track)" tickLine={false} height={46} />
            <YAxis
              domain={mesure === 'occupation' ? [0, 100] : [0, 'auto']}
              stroke="var(--track)"
              tick={{ fill: 'var(--muted)', fontSize: 11.5 }}
              tickLine={false}
              axisLine={false}
              width={58}
              label={{ value: mesure === 'occupation' ? 'Occupation (%)' : 'Places libres', angle: -90, position: 'insideLeft', fill: 'var(--ink-2)', fontSize: 12.5, style: { textAnchor: 'middle' } }}
            />
            <Tooltip content={<InfoBulle unite={unite} />} cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }} isAnimationActive={false} />
            {NOMS.filter(n => selection.includes(n)).map(nom => (
              <Line key={nom} type="monotone" dataKey={nom} name={nom} stroke={COULEUR[nom]} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const basculer = nom => setSelection(sel => (sel.includes(nom) ? sel.filter(n => n !== nom) : NOMS.filter(n => n === nom || sel.includes(n))));

  return (
    <section className="card history" aria-labelledby="h-titre">
      <div className="history-head">
        <div>
          <p className="eyebrow">Historique d'occupation</p>
          <h2 id="h-titre">Évolution des places sur la période</h2>
        </div>
        <div className="history-ctl">
          <SegmentedControl label="Période" options={PLAGES} value={heures} onChange={setHeures} />
          <SegmentedControl label="Mesure" options={MESURES} value={mesure} onChange={setMesure} />
        </div>
      </div>
      <div className="chips">
        {NOMS.map(nom => (
          <button key={nom} type="button" className="toggle" style={{ '--c': COULEUR[nom] }} aria-pressed={selection.includes(nom)} onClick={() => basculer(nom)}>
            <i />
            {nom}
          </button>
        ))}
      </div>
      {contenu}
      {loading && <Loader message="Chargement de l'historique..." />}
    </section>
  );
}
