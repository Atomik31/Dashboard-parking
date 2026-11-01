import { useEffect, useRef, useState } from 'react';
import { PARKINGS } from '../../shared/config.js';
import { useI18n } from '../hooks/useI18n.jsx';

const SRC_VIDEO = '/media/video-promo.mp4';
const reduit = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* Volet gauche de la connexion : vidéo promo en fond (muette, en boucle), titre, lieu qui change, parkings couverts.
   Aucune donnée en direct ici : l'API exige d'être connecté. */
export default function LoginHero() {
  const { t } = useI18n();
  const video = useRef(null);
  const [lieu, setLieu] = useState(0);
  const [actif, setActif] = useState(0);

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
      </div>
      <div className="float-chip fc-1">🕒 {t.hero_chip_update}</div>
      <div className="float-chip fc-2">🅿️ {t.hero_chip_count}</div>
    </section>
  );
}
