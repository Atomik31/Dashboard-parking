import { describe, expect, it } from 'vitest';
import { apercuPublic } from '../server/public.js';

describe('apercuPublic', () => {
  it('ne garde que les champs autorisés, avec des types sûrs', () => {
    const out = apercuPublic({
      updatedAt: '2026-11-01T10:00:00.000Z',
      parkings: [{ nom: 'Carnot', places: 209, capacite: 675, statut: '✅ Ouvert', affichage: '209 / 675', latitude: 1, longitude: 2, extra: { a: 1 } }]
    });
    expect(out.parkings[0]).toEqual({ nom: 'Carnot', statut: '✅ Ouvert', affichage: '209 / 675', places: 209, capacite: 675 });
  });
  it('neutralise les valeurs invalides et écarte les entrées sans nom', () => {
    const out = apercuPublic({ parkings: [{ nom: 'A', places: 'x', capacite: NaN, statut: 5 }, { places: 3 }, null] });
    expect(out.parkings).toEqual([{ nom: 'A', statut: '', affichage: '', places: 0, capacite: 0 }]);
    expect(out.updatedAt).toBeNull();
  });
  it('tronque les textes trop longs', () => {
    expect(apercuPublic({ parkings: [{ nom: 'x'.repeat(500), places: 1, capacite: 2 }] }).parkings[0].nom).toHaveLength(80);
  });
  it('entrée invalide -> liste vide', () => {
    expect(apercuPublic(null)).toEqual({ updatedAt: null, parkings: [] });
    expect(apercuPublic({ parkings: 'non' }).parkings).toEqual([]);
  });
});
