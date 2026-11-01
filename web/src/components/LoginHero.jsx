import { useEffect, useRef, useState } from 'react';
import { PARKINGS } from '../../shared/config.js';
import { useApercuPublic } from '../hooks/useApercuPublic.js';
import { useI18n } from '../hooks/useI18n.jsx';
import { etatParking, fmtNombre } from '../lib/format.js';

const SRC_VIDEO = '/media/video-promo.mp4';
const reduit = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const COULEUR = { good: 'var(--good)', warn: 'var(--warn)', crit: 'var(--crit)' };

/* Compteur animé vers `cible` (sans animation si les mouvements sont réduits). */
function useCompteur(cible) {
  const [val, setVal] = useState(cible);
  useEffect(() => {
    if (reduit()) {
      setVal(cible);
      return undefined;
    }
    let raf;
    const t0 = performance.now();
    const frame = t => {
      const x = Math.min(1, (t - t0) / 900);
      setVal(Math.round(cible * (1 - Math.pow(1 - x, 3))));
      if (x < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [cible]);
  return val;
}

/* Carte « places libres maintenant » : un parking à la fois, défilement toutes les 3,2 s. */
function CarteDirect({ parkings }) {
  const { t } = useI18n();
  const [k, setK] = useState(0);
  useEffect(() => {
    if (reduit() || parkings.length < 2) return undefined;
    const id = setInterval(() => setK(i => i + 1), 3200);
    return () => clearInterval(id);
  }, [parkings.length]);
  const i = k % parkings.length;
  const p = parkings[i];
  const etat = etatParking(p.statut, p.places, p.capacite);
  const pct = Math.round((p.places / p.capacite) * 100);
  const valeur = useCompteur(p.places);
  return (
    <div className="glass live-card">
      <div className="swap" key={`h-${p.nom}`}>
        <div className="live-top">
          <span className="eyebrow">{t.hero_now}</span>
          <span className={`chip ${etat}`}>{t[`state_${etat}`]}</span>
        </div>
        <div className="live-main">
          <span className="live-name">{p.nom}</span>
          <span className="live-num num">{fmtNombre(valeur)}</span>
        </div>
      </div>
      <div className="bar" role="img" aria-label={`${pct} %`}>
        <i style={{ width: `${Math.max(3, pct)}%`, background: COULEUR[etat] }} />
      </div>
      <div className="live-foot">
        <span>{t.hero_of.replace('{cap}', fmtNombre(p.capacite)).replace('{pct}', String(pct))}</span>
        <span className="live-dots" aria-hidden="true">
          {parkings.map((q, n) => (
            <i key={q.nom} className={n === i ? 'on' : ''} />
          ))}
        </span>
      </div>
    </div>
  );
}

/* Volet gauche de la connexion : vidéo promo en fond (muette, en boucle), titre, lieu qui change, parkings couverts.
   Aucune donnée en direct ici : l'API exige d'être connecté. */
export default function LoginHero() {
  const { t } = useI18n();
  const video = useRef(null);
  const [lieu, setLieu] = useState(0);
  const [actif, setActif] = useState(0);
  const apercu = useApercuPublic();

  /* La vidéo (5 Mo) n'est chargée que si le volet est visible (pas sur mobile) et si les animations sont permises. */
  useEffect(() => {
    const v = video.current;
    if (!v || reduit() || !window.matchMedia('(min-width: 721px)').matches) return undefined;
    v.src = SRC_VIDEO;
    v.muted = true;
    v.play().catch(() => {
      /* lecture automatique bloquée : l'affiche reste affichée */
    });
    return () => {
      v.pause();
      v.removeAttribute('src');
      v.load();
    };
  }, []);

  useEffect(() => {
    if (reduit()) return undefined;
    const a = setInterval(() => setLieu(i => i + 1), 2800);
    const b = setInterval(() => setActif(i => i + 1), 1500);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, []);

  const lieux = t.hero_places;
  return (
    <section className="auth-art">
      <video ref={video} className="art-video" muted loop playsInline preload="metadata" poster="/media/video-poster.jpg" aria-hidden="true" tabIndex={-1} />
      <div className="art-shade" />
      <div className="art-top">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            P
          </span>
          <span className="brand-title">{t.app_name}</span>
        </div>
        <span className="live live-glass">
          <span className="dot" aria-hidden="true" />
          {t.hero_live}
        </span>
      </div>
      <div className="art-copy">
        <h2>
          {t.hero_a}
          <br />
          {t.hero_b}
          <span className="brand-grad">{t.hero_brand}</span>
        </h2>
        <div className="rot-line">
          <span aria-hidden="true">📍</span>
          <span className="rot" aria-live="off">
            <span key={lieu}>{lieux[lieu % lieux.length]}</span>
          </span>
        </div>
        <p>{t.hero_text}</p>
        {apercu ? (
          <CarteDirect parkings={apercu} />
        ) : (
          <div className="glass covered">
            <span className="eyebrow">{t.hero_covered}</span>
            <div className="covered-chips">
              {PARKINGS.map((p, i) => (
                <span key={p.nom} className={i === actif % PARKINGS.length ? 'on' : ''}>
                  {p.nom}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="float-chip fc-1">🕒 {t.hero_chip_update}</div>
      <div className="float-chip fc-2">🅿️ {t.hero_chip_count}</div>
    </section>
  );
}
