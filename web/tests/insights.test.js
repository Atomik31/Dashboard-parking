import { describe, expect, it } from 'vitest';
import { initiale, meilleurChoix, occupationEntiere, serieTotale, tendance30 } from '../src/lib/insights.js';
import { STATUT_OUVERT } from '../shared/config.js';

const ouvert = (nom, places, capacite) => ({ nom, places, capacite, statut: STATUT_OUVERT });
const ferme = nom => ({ nom, places: 0, capacite: 500, statut: '⚠️ Fermeture temporaire' });

describe('occupation et meilleur choix', () => {
  it('ignore les parkings fermés', () => {
    expect(occupationEntiere([ouvert('A', 50, 100), ouvert('B', 150, 300), ferme('C')])).toBe(50);
  });
  it('null sans parking ouvert', () => {
    expect(occupationEntiere([ferme('C')])).toBeNull();
    expect(meilleurChoix([ferme('C')])).toBeNull();
  });
  it('meilleur choix = le plus de places libres parmi les ouverts', () => {
    expect(meilleurChoix([ouvert('A', 10, 100), ouvert('B', 90, 100), ferme('C')]).nom).toBe('B');
  });
});

describe('serieTotale', () => {
  it('additionne les parkings par relevé et trie', () => {
    const rows = [
      { t: '2026-11-01T10:10:00.000Z', parking: 'A', dispo: 5, total: 10 },
      { t: '2026-11-01T10:00:00.000Z', parking: 'A', dispo: 3, total: 10 },
      { t: '2026-11-01T10:00:00.000Z', parking: 'B', dispo: 7, total: 20 },
      { t: 'invalide', parking: 'B', dispo: 1, total: 20 }
    ];
    expect(serieTotale(rows)).toEqual([
      { ms: Date.parse('2026-11-01T10:00:00.000Z'), total: 10 },
      { ms: Date.parse('2026-11-01T10:10:00.000Z'), total: 5 }
    ]);
  });
  it('vide ou absent', () => {
    expect(serieTotale([])).toEqual([]);
    expect(serieTotale(null)).toEqual([]);
  });
});

describe('tendance30', () => {
  const now = Date.parse('2026-11-01T12:00:00.000Z');
  const rows = [
    { t: '2026-11-01T11:30:00.000Z', parking: 'A', dispo: 100, total: 300 },
    { t: '2026-11-01T11:30:00.000Z', parking: 'B', dispo: 40, total: 300 },
    { t: '2026-11-01T11:50:00.000Z', parking: 'A', dispo: 80, total: 300 }
  ];
  it('compare aux places d\'il y a ~30 min', () => {
    expect(tendance30(rows, 'A', 120, now)).toBe(20);
    expect(tendance30(rows, 'B', 30, now)).toBe(-10);
  });
  it('null si l\'historique ne couvre pas l\'instant visé', () => {
    expect(tendance30(rows.slice(2), 'A', 120, now)).toBeNull();
    expect(tendance30(rows, 'Z', 5, now)).toBeNull();
    expect(tendance30([], 'A', 5, now)).toBeNull();
  });
});

describe('initiale', () => {
  it('première lettre en majuscule', () => {
    expect(initiale('julien@exemple.fr')).toBe('J');
    expect(initiale('  élodie@x.fr')).toBe('É');
    expect(initiale('')).toBe('?');
    expect(initiale(undefined)).toBe('?');
  });
});
