import { useMemo } from 'react';
import { PARKINGS, STATUT_OUVERT } from '../../shared/config.js';
import { useI18n } from '../hooks/useI18n.jsx';
import { fmtNombre, synthese } from '../lib/format.js';
import { interpoler } from '../lib/i18n.js';
import { meilleurChoix, occupationEntiere } from '../lib/insights.js';

const W = 300;
const H = 90;

/* Courbe du total de places libres sur 24 h (fond de la première carte). */
function Sparkline({ serie }) {
  const d = useMemo(() => {
    if (serie.length < 3) return null;
    const vals = serie.map(p => p.total);
    const mx = Math.max(...vals);
    const mn = Math.min(...vals);
    const x = i => (i / (serie.length - 1)) * W;
    const y = v => H - 8 - ((v - mn) / (mx - mn || 1)) * (H - 20);
    return serie.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ');
  }, [serie]);
  if (!d) return null;
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill="url(#spark-grad)" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

const R = 34;
const C = 2 * Math.PI * R;

export default function Kpis({ parkings, serie }) {
  const { t } = useI18n();
  const s = synthese(parkings);
  const capacite = parkings.filter(p => p.statut === STATUT_OUVERT).reduce((n, p) => n + p.capacite, 0);
  const occ = occupationEntiere(parkings);
  const best = meilleurChoix(parkings);
  return (
    <section className="kpis" aria-label="Indicateurs">
      <article className="card kpi kpi-hero">
        <div className="eyebrow">{t.kpi_free}</div>
        <div className="kpi-value num">
          {fmtNombre(s.libres)}
          <small>{t.kpi_places}</small>
        </div>
        <div className="kpi-sub">{capacite ? interpoler(t.kpi_of, { cap: fmtNombre(capacite) }) : t.kpi_none}</div>
        <Sparkline serie={serie} />
      </article>
      <article className="card kpi">
        <div className="eyebrow">{t.kpi_open}</div>
        <div className="kpi-value num">
          {s.nbOuverts}
          <small>/ {PARKINGS.length}</small>
        </div>
        <div className="kpi-sub">{t.kpi_inservice}</div>
      </article>
      <article className="card kpi">
        <div className="eyebrow">{t.kpi_occ}</div>
        <div className="ring-wrap" style={{ marginTop: 8 }}>
          <svg className="ring" viewBox="0 0 84 84" aria-hidden="true">
            <defs>
              <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#5b8cff" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <circle cx="42" cy="42" r={R} fill="none" stroke="var(--track)" strokeWidth="9" />
            <circle cx="42" cy="42" r={R} fill="none" stroke="url(#ring-grad)" strokeWidth="9" strokeLinecap="round" transform="rotate(-90 42 42)" strokeDasharray={`${((occ ?? 0) / 100) * C} ${C}`} />
            <text x="42" y="47" textAnchor="middle" fontSize="17">
              {occ === null ? '–' : `${occ} %`}
            </text>
          </svg>
          <div className="kpi-sub">{t.kpi_occupied}</div>
        </div>
      </article>
      <article className="card kpi">
        <div className="best">
          <div>
            <div className="eyebrow">{t.kpi_best}</div>
            <div className="best-name">{best ? best.nom : '–'}</div>
          </div>
          {best && (
            <div className="best-meta">
              <span className="chip good">{interpoler(t.kpi_best_places, { n: fmtNombre(best.places) })}</span>
              <span>{interpoler(t.pct_free, { pct: Math.round((best.places / best.capacite) * 100) })}</span>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
