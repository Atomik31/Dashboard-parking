import { describe, expect, it } from 'vitest';
import { MESSAGES, interpoler, libelleAffichage } from '../src/lib/i18n.js';

const cles = o => Object.keys(o).sort();

describe('messages FR / EN', () => {
  it('mêmes clés dans les deux langues (aucun texte oublié)', () => {
    expect(cles(MESSAGES.en)).toEqual(cles(MESSAGES.fr));
    expect(cles(MESSAGES.en.errors)).toEqual(cles(MESSAGES.fr.errors));
  });
  it('mêmes marqueurs {x} dans chaque paire de textes', () => {
    const marqueurs = v => (typeof v === 'string' ? (v.match(/\{\w+\}/g) ?? []).sort() : []);
    for (const k of Object.keys(MESSAGES.fr)) expect(marqueurs(MESSAGES.en[k]), k).toEqual(marqueurs(MESSAGES.fr[k]));
  });
  it('aucun texte vide', () => {
    for (const lang of ['fr', 'en']) for (const [k, v] of Object.entries(MESSAGES[lang])) if (typeof v === 'string') expect(v.trim(), `${lang}.${k}`).not.toBe('');
  });
});

describe('interpoler', () => {
  it('remplace les marqueurs connus et laisse les autres', () => {
    expect(interpoler('sur {cap} places · {pct} %', { cap: '1 800', pct: 52 })).toBe('sur 1 800 places · 52 %');
    expect(interpoler('{x} et {y}', { x: 1 })).toBe('1 et {y}');
  });
});

describe('libelleAffichage', () => {
  it('traduit les libellés connus de la Semepa, laisse les autres', () => {
    expect(libelleAffichage('Fermeture temporaire', MESSAGES.en)).toBe('Temporarily closed');
    expect(libelleAffichage('COMPLET', MESSAGES.en)).toBe('Full');
    expect(libelleAffichage('Travaux', MESSAGES.en)).toBe('Travaux');
    expect(libelleAffichage('Fermeture temporaire', MESSAGES.fr)).toBe('Fermeture temporaire');
  });
});
