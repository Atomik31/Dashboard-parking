import { describe, expect, it, vi } from 'vitest';
import { createHistoryService, parseHistorique, parseLigneCsv } from '../server/history.js';
import { createTtlCache } from '../server/cache.js';

const NOW = Date.parse('2026-07-03T18:00:00Z');
const CSV = [
  'timestamp_utc,date,heure,parking,places_dispo,places_total,statut',
  '2026-07-03T17:50:00+00:00,2026-07-03,19:50:00,Rotonde,553,1800,✅ Ouvert',
  '2026-07-03T17:40:00+00:00,2026-07-03,19:40:00,Carnot,100,675,✅ Ouvert',
  '2026-07-03T10:00:00+00:00,2026-07-03,12:00:00,Carnot,200,675,✅ Ouvert',
  '2026-07-01T10:00:00+00:00,2026-07-01,12:00:00,Carnot,300,675,✅ Ouvert',
  'ligne,cassée',
  '2026-07-03T17:55:00+00:00,2026-07-03,19:55:00,Mignet,abc,800,✅ Ouvert'
].join('\n');

describe('lecture de l\'historique', () => {
  it('parseLigneCsv gère les guillemets', () => expect(parseLigneCsv('a,"b,c","d""e"')).toEqual(['a', 'b,c', 'd"e']));
  it('filtre la fenêtre, ignore les lignes invalides, trie', () => {
    const rows = parseHistorique(CSV, NOW - 24 * 3600_000, NOW);
    expect(rows.map(r => r.parking)).toEqual(['Carnot', 'Carnot', 'Rotonde']);
    expect(rows[2]).toEqual({ t: '2026-07-03T17:50:00.000Z', parking: 'Rotonde', dispo: 553, total: 1800 });
  });
  it('en-tête inattendu -> vide', () => expect(parseHistorique('a,b\n1,2', 0, NOW)).toEqual([]));
  it('service : fenêtre en heures et cache', async () => {
    const lireCsv = vi.fn(async () => CSV);
    const s = createHistoryService({ lireCsv, now: () => NOW });
    expect((await s.get(1)).map(r => r.parking)).toEqual(['Carnot', 'Rotonde']);
    expect(await s.get(24)).toHaveLength(3);
    expect(lireCsv).toHaveBeenCalledTimes(1);
  });
  it('fichier absent -> []', async () => {
    expect(await createHistoryService({ lireCsv: async () => null, now: () => NOW }).get(6)).toEqual([]);
  });
});

describe('cache TTL', () => {
  it('partage un chargement et expire', async () => {
    let t = 0;
    const loader = vi.fn(async () => ++t);
    let horloge = 0;
    const c = createTtlCache({ ttlMs: 1000, loader, now: () => horloge });
    const [a, b] = await Promise.all([c.get(), c.get()]);
    expect([a, b]).toEqual([1, 1]);
    horloge = 999;
    expect(await c.get()).toBe(1);
    horloge = 1001;
    expect(await c.get()).toBe(2);
    expect(await c.refresh(5000)).toBe(2); // trop récent : pas de nouveau chargement
    expect(await c.refresh(0)).toBe(3);
  });
});
