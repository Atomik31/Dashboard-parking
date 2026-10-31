import { describe, expect, it, vi } from 'vitest';
import { PARKINGS, STATUT_ERREUR, STATUT_OUVERT, STATUT_SANS_DONNEES } from '../shared/config.js';
import { construireEntree, parsePlaces, scrapeAll, scrapeParking } from '../server/scraper.js';

const P = { nom: 'Test', baseUrl: 'https://parkings-semepa.fr/', pageId: 1, capacite: 500, latitude: 43.5, longitude: 5.4 };
const HTML_NOMBRE = '<div><p class="nbPlaces"><span style="font-size:30px;color:#ae0a15;">205</span> places libres</p></div>';
const HTML_COMPLET = '<div><p class="nbPlaces"><span style="color:#ae0a15;">COMPLET</span></p></div>';
const HTML_FERMETURE = '<div><p class="nbPlaces"><span>Fermeture temporaire</span></p></div>';
const silence = { info() {}, warn() {}, error() {} };

describe('parsePlaces', () => {
  it('extrait un nombre', () => expect(parsePlaces(HTML_NOMBRE)).toEqual([205, null]));
  it('extrait COMPLET', () => expect(parsePlaces(HTML_COMPLET)).toEqual([null, 'COMPLET']));
  it('extrait un message de fermeture', () => expect(parsePlaces(HTML_FERMETURE)).toEqual([null, 'Fermeture temporaire']));
  it('page sans données', () => expect(parsePlaces('<html>rien</html>')).toEqual([null, null]));
});

describe('construireEntree', () => {
  it('parking ouvert', () => {
    const e = construireEntree(P, 205, null);
    expect(e).toMatchObject({ places: 205, capacite: 500, affichage: '205 / 500', statut: STATUT_OUVERT });
    expect(e.timestamp).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
  it.each([0, 1, 2])('%i place(s) : COMPLET (SEUIL_COMPLET)', n => {
    expect(construireEntree(P, n, null)).toMatchObject({ affichage: 'COMPLET', statut: STATUT_OUVERT });
  });
  it('3 places : pas complet', () => expect(construireEntree(P, 3, null).affichage).toBe('3 / 500'));
  it('texte COMPLET (insensible à la casse)', () => {
    expect(construireEntree(P, null, 'complet')).toMatchObject({ places: 0, affichage: 'COMPLET', statut: STATUT_OUVERT });
  });
  it('fermeture temporaire', () => {
    expect(construireEntree(P, null, 'Fermeture temporaire')).toMatchObject({ places: 0, statut: '⚠️ Fermeture temporaire' });
  });
  it('sans données', () => expect(construireEntree(P, null, null)).toMatchObject({ affichage: 'N/A', statut: STATUT_SANS_DONNEES }));
  it('reporte coordonnées et capacité', () => expect(construireEntree(P, 100, null)).toMatchObject({ capacite: 500, latitude: 43.5, longitude: 5.4 }));
});

const reponse = (html, status = 200, headers = {}) => new Response(html, { status, headers });

describe('scrapeParking', () => {
  it('interroge uniquement l\'URL de configuration avec page_id', async () => {
    const fetchImpl = vi.fn(async () => reponse(HTML_NOMBRE));
    const e = await scrapeParking(P, { fetchImpl, log: silence });
    expect(fetchImpl.mock.calls[0][0]).toBe('https://parkings-semepa.fr/?page_id=1');
    expect(e.places).toBe(205);
  });
  it('erreur HTTP -> Erreur', async () => {
    const e = await scrapeParking(P, { fetchImpl: async () => reponse('x', 500), log: silence });
    expect(e).toMatchObject({ affichage: 'Erreur', statut: STATUT_ERREUR });
  });
  it('erreur réseau -> Erreur', async () => {
    const e = await scrapeParking(P, { fetchImpl: async () => { throw new Error('timeout'); }, log: silence });
    expect(e.statut).toBe(STATUT_ERREUR);
  });
  it('refuse une redirection vers un hôte hors configuration (pas de SSRF)', async () => {
    const fetchImpl = vi.fn(async () => reponse('', 302, { location: 'https://evil.example/' }));
    const e = await scrapeParking(P, { fetchImpl, log: silence });
    expect(e.statut).toBe(STATUT_ERREUR);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it('suit une redirection vers un hôte de la configuration', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(reponse('', 301, { location: 'https://mamp.parkings-semepa.fr/?page_id=1' }))
      .mockResolvedValueOnce(reponse(HTML_NOMBRE));
    expect((await scrapeParking(P, { fetchImpl, log: silence })).places).toBe(205);
  });
});

describe('scrapeAll', () => {
  it('scrape les 9 parkings', async () => {
    const urls = [];
    const fetchImpl = async url => { urls.push(url); return reponse(HTML_NOMBRE); };
    const r = await scrapeAll({ fetchImpl, delaiMs: 0, log: silence });
    expect(r.parkings).toHaveLength(PARKINGS.length);
    expect(urls.every(u => /^https:\/\/(mamp\.)?parkings-semepa\.fr\/\?page_id=\d+$/.test(u))).toBe(true);
    expect(r.updatedAtLabel).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});
