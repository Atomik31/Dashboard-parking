import { describe, expect, it } from 'vitest';
import { STATUT_OUVERT, STATUT_SANS_DONNEES, COULEURS_SERIES, PARKINGS, HEURES_AUTORISEES } from '../shared/config.js';
import { etatParking, fmtNombre, occupationPct, synthese, trierParkings } from '../shared/parking.js';
import { fmtHeure, pivoterHistorique, graduations } from '../src/lib/format.js';
import { detecterLangue } from '../src/lib/i18n.js';
import { analyser, serialiser } from '../src/lib/consent.js';

describe('etatParking', () => {
  it('fermé si statut non ouvert', () => expect(etatParking(STATUT_SANS_DONNEES, 100, 100)).toBe('closed'));
  it('large au-dessus de 50 %', () => expect(etatParking(STATUT_OUVERT, 51, 100)).toBe('good'));
  it('limité entre 10 et 50 % (bornes incluses)', () => {
    expect(etatParking(STATUT_OUVERT, 50, 100)).toBe('warn');
    expect(etatParking(STATUT_OUVERT, 11, 100)).toBe('warn');
  });
  it('presque complet à 10 % et moins', () => {
    expect(etatParking(STATUT_OUVERT, 10, 100)).toBe('crit');
    expect(etatParking(STATUT_OUVERT, 0, 100)).toBe('crit');
  });
  it('capacité nulle sans division par zéro', () => expect(etatParking(STATUT_OUVERT, 0, 0)).toBe('crit'));
});

describe('formatage', () => {
  it('fmtNombre : séparateur de milliers', () => {
    expect(fmtNombre(0)).toBe('0');
    expect(fmtNombre(999)).toBe('999');
    expect(fmtNombre(1230)).toBe('1 230');
    expect(fmtNombre(1234567)).toBe('1 234 567');
  });
  it('occupationPct', () => {
    expect(occupationPct(250, 1000)).toBe(75);
    expect(occupationPct(2000, 1000)).toBe(0);
    expect(occupationPct(-5, 1000)).toBe(100);
    expect(occupationPct(1, 0)).toBe(0);
  });
  it('fmtHeure en Europe/Paris', () => expect(fmtHeure(Date.parse('2026-07-03T16:21:14Z'))).toBe('18:21'));
  it('tri : ouverts d\'abord puis places décroissantes', () => {
    const l = trierParkings([
      { nom: 'a', statut: '⚠️ x', places: 0 }, { nom: 'b', statut: STATUT_OUVERT, places: 5 }, { nom: 'c', statut: STATUT_OUVERT, places: 50 }
    ]);
    expect(l.map(p => p.nom)).toEqual(['c', 'b', 'a']);
  });
  it('synthese', () => {
    const s = synthese([
      { statut: STATUT_OUVERT, places: 100, capacite: 400 }, { statut: STATUT_OUVERT, places: 100, capacite: 400 }, { statut: '⚠️ x', places: 0, capacite: 800 }
    ]);
    expect(s).toEqual({ libres: 200, nbOuverts: 2, occupation: '75 %' });
    expect(synthese([]).occupation).toBe('–');
  });
});

describe('config', () => {
  it('9 parkings, une couleur chacun, plages 1/6/12/24', () => {
    expect(PARKINGS).toHaveLength(9);
    expect(COULEURS_SERIES).toHaveLength(9);
    expect(HEURES_AUTORISEES).toEqual([1, 6, 12, 24]);
  });
});

describe('historique', () => {
  const rows = [
    { t: '2026-07-03T10:00:00.000Z', parking: 'Carnot', dispo: 100, total: 400 },
    { t: '2026-07-03T10:00:00.000Z', parking: 'Rotonde', dispo: 900, total: 1800 },
    { t: '2026-07-03T10:10:00.000Z', parking: 'Carnot', dispo: 80, total: 400 }
  ];
  it('pivote par horodatage avec la sélection', () => {
    const p = pivoterHistorique(rows, ['Carnot'], 'libres', occupationPct);
    expect(p).toHaveLength(2);
    expect(p[0]).toMatchObject({ Carnot: 100 });
    expect(p[0].Rotonde).toBeUndefined();
  });
  it('mesure occupation', () => expect(pivoterHistorique(rows, ['Carnot'], 'occupation', occupationPct)[1].Carnot).toBe(80));
  it('graduations régulières et alignées', () => {
    const d = [{ ms: Date.parse('2026-07-03T10:07:00Z') }, { ms: Date.parse('2026-07-03T16:00:00Z') }];
    const t = graduations(d, 6);
    expect(t[0]).toBe(Date.parse('2026-07-03T11:00:00Z'));
    expect(t.at(-1)).toBe(Date.parse('2026-07-03T16:00:00Z'));
  });
});

describe('langue et consentement', () => {
  it('détecte fr/en, fr par défaut', () => {
    expect(detecterLangue({ languages: ['en-US', 'fr'] })).toBe('en');
    expect(detecterLangue({ languages: ['de-DE'], language: 'de-DE' })).toBe('fr');
    expect(detecterLangue(null)).toBe('fr');
  });
  it('consentement valable 12 mois', () => {
    const maintenant = Date.now();
    expect(analyser(serialiser('accepted', maintenant), maintenant + 364 * 86400_000)).toBe('accepted');
    expect(analyser(serialiser('refused', maintenant), maintenant + 366 * 86400_000)).toBeNull();
    expect(analyser('n’importe quoi')).toBeNull();
    expect(analyser(JSON.stringify({ c: 'hack', exp: Date.now() + 1e9 }))).toBeNull();
  });
});
