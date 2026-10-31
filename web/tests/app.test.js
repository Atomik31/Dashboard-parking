import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { upsertCompte } from '../server/airtable.js';
import { AuthError } from '../server/auth.js';
import { createApp } from '../server/app.js';

const silence = { info() {}, warn() {}, error() {} };
const PARKINGS = { updatedAt: '2026-07-03T10:00:00.000Z', updatedAtLabel: '12:00:00', parkings: [{ nom: 'Carnot', places: 100, capacite: 675 }] };

const verify = async token => {
  if (token === 'tokengoogle0000') return { uid: 'u1', email: 'a@b.fr', provider: 'google.com' };
  if (token === 'tokenmail00000') return { uid: 'u2', email: 'c@d.fr', provider: 'password' };
  if (token === 'tokenanon00000') return { uid: 'u3', email: 'e@f.fr', provider: 'anonymous' };
  throw new AuthError('Jeton invalide');
};

let serveur;
let base;
const comptes = vi.fn(async () => 'created');
const history = { get: vi.fn(async h => [{ t: '2026-07-03T10:00:00.000Z', parking: 'Carnot', dispo: 1, total: 2, h }]) };
const scraper = vi.fn(async () => PARKINGS);

beforeAll(async () => {
  const app = createApp({ env: { NODE_ENV: 'test', FIREBASE_PROJECT_ID: 'p', AIRTABLE_TOKEN: 'x' }, verify, scraper, history, comptes, log: silence });
  await new Promise(r => { serveur = app.listen(0, r); });
  base = `http://127.0.0.1:${serveur.address().port}`;
});
afterAll(() => serveur.close());

const get = (p, token, opts = {}) => fetch(base + p, { ...opts, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers } });

describe('API', () => {
  it('/api/health sans jeton', async () => expect(await (await get('/api/health')).json()).toEqual({ status: 'ok' }));
  it('en-têtes de sécurité', async () => {
    const r = await get('/api/health');
    expect(r.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(r.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(r.headers.get('x-powered-by')).toBeNull();
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
  });
  it.each(['/api/parkings', '/api/history?hours=6'])('%s sans jeton -> 401', async p => expect((await get(p)).status).toBe(401));
  it('refuse un jeton invalide -> 401', async () => expect((await get('/api/parkings', 'invalidtoken00')).status).toBe(401));
  it('refuse un schéma non Bearer -> 401', async () => {
    expect((await get('/api/parkings', null, { headers: { Authorization: 'Basic tokengoogle0000' } })).status).toBe(401);
  });
  it('/api/parkings avec jeton', async () => {
    const r = await get('/api/parkings', 'tokengoogle0000');
    expect(r.status).toBe(200);
    expect((await r.json()).parkings[0].nom).toBe('Carnot');
  });
  it('/api/history : hours en liste blanche', async () => {
    expect((await get('/api/history?hours=12', 'tokengoogle0000')).status).toBe(200);
    expect((await get('/api/history', 'tokengoogle0000')).status).toBe(200);
    for (const h of ['5', 'abc', '24;x', '1&hours=6'.replace('&', '&')]) {
      if (h === '1&hours=6') continue;
      expect((await get('/api/history?hours=' + encodeURIComponent(h), 'tokengoogle0000')).status).toBe(400);
    }
    expect((await get('/api/history?hours=1&hours=6', 'tokengoogle0000')).status).toBe(400);
  });
  it('/api/refresh exige un jeton', async () => {
    expect((await get('/api/refresh', null, { method: 'POST' })).status).toBe(401);
    expect((await get('/api/refresh', 'tokengoogle0000', { method: 'POST' })).status).toBe(200);
  });
  it('route inconnue -> 404 JSON sans stack', async () => {
    const r = await get('/api/nope');
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: 'Introuvable' });
  });
  it('corps JSON trop gros -> 413 ; JSON invalide -> 400', async () => {
    const h = { 'Content-Type': 'application/json' };
    expect((await get('/api/signup', 'tokengoogle0000', { method: 'POST', headers: h, body: JSON.stringify({ lang: 'x'.repeat(10_000) }) })).status).toBe(413);
    expect((await get('/api/signup', 'tokengoogle0000', { method: 'POST', headers: h, body: '{oops' })).status).toBe(400);
  });
});

describe('/api/signup', () => {
  const post = (token, body) => get('/api/signup', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  it('jeton requis', async () => expect((await post(null, { lang: 'fr' })).status).toBe(401));
  it('méthode déduite du jeton, jamais du body', async () => {
    comptes.mockClear();
    await post('tokengoogle0000', { lang: 'en', methode: 'E-mail', email: 'pirate@x.fr', uid: 'autre' });
    expect(comptes).toHaveBeenCalledWith({ token: 'x', email: 'a@b.fr', uid: 'u1', methode: 'Google', langue: 'en' });
    await post('tokenmail00000', { lang: 'fr' });
    expect(comptes).toHaveBeenLastCalledWith(expect.objectContaining({ methode: 'E-mail', uid: 'u2' }));
  });
  it('langue hors liste blanche -> fr', async () => {
    await post('tokengoogle0000', { lang: '<script>' });
    expect(comptes).toHaveBeenLastCalledWith(expect.objectContaining({ langue: 'fr' }));
  });
  it('provider non pris en charge -> 400', async () => expect((await post('tokenanon00000', { lang: 'fr' })).status).toBe(400));
  it('échec Airtable -> 502 sans fuite', async () => {
    comptes.mockRejectedValueOnce(new Error('Airtable HTTP 500 secret'));
    const r = await post('tokengoogle0000', { lang: 'fr' });
    expect(r.status).toBe(502);
    expect(JSON.stringify(await r.json())).not.toContain('secret');
  });
});

describe('démarrage sécurisé', () => {
  it('refuse de démarrer avec le bypass en production', () => {
    expect(() => createApp({ env: { NODE_ENV: 'production', AUTH_DEV_BYPASS: '1' }, log: silence })).toThrow();
  });
  it('sans FIREBASE_PROJECT_ID : 401 sans jeton, 503 avec jeton (jamais d\'accès)', async () => {
    const app = createApp({ env: { NODE_ENV: 'test' }, scraper, history, log: silence });
    const s = await new Promise(r => { const x = app.listen(0, () => r(x)); });
    const url = `http://127.0.0.1:${s.address().port}/api/parkings`;
    expect((await fetch(url)).status).toBe(401);
    expect((await fetch(url, { headers: { Authorization: 'Bearer ' + 'a'.repeat(40) } })).status).toBe(503);
    s.close();
  });
  it('bypass dev accepté hors production uniquement avec le jeton dev', async () => {
    const app = createApp({ env: { NODE_ENV: 'development', AUTH_DEV_BYPASS: '1' }, scraper, history, log: silence });
    const s = await new Promise(r => { const x = app.listen(0, () => r(x)); });
    const url = `http://127.0.0.1:${s.address().port}/api/parkings`;
    expect((await fetch(url, { headers: { Authorization: 'Bearer dev-bypass' } })).status).toBe(200);
    expect((await fetch(url, { headers: { Authorization: 'Bearer autre-jeton-long' } })).status).toBe(401);
    s.close();
  });
});

describe('Airtable upsertCompte', () => {
  const opts = (reponses, calls) => ({
    now: () => new Date('2026-07-03T10:00:00Z'),
    fetchImpl: async (url, o = {}) => { calls.push({ url, ...o }); return new Response(JSON.stringify(reponses.shift()), { status: 200 }); }
  });
  const compte = { token: 't', email: 'a@b.fr', uid: 'u1', methode: 'Google', langue: 'fr' };
  it('création : POST avec « Créé le »', async () => {
    const calls = [];
    expect(await upsertCompte(compte, opts([{ records: [] }, {}], calls))).toBe('created');
    expect(calls[1].method).toBe('POST');
    expect(JSON.parse(calls[1].body).fields).toEqual({ Email: 'a@b.fr', 'UID Firebase': 'u1', 'Méthode': 'Google', Langue: 'fr', 'Créé le': '2026-07-03T10:00:00.000Z' });
    expect(calls[0].headers.Authorization).toBe('Bearer t');
  });
  it('mise à jour : PATCH sans « Créé le »', async () => {
    const calls = [];
    expect(await upsertCompte(compte, opts([{ records: [{ id: 'rec1' }] }, {}], calls))).toBe('updated');
    expect(calls[1].method).toBe('PATCH');
    expect(calls[1].url).toMatch(/\/rec1$/);
    expect(JSON.parse(calls[1].body).fields['Créé le']).toBeUndefined();
  });
  it('sans token ou uid dangereux : refuse', async () => {
    await expect(upsertCompte({ ...compte, token: '' })).rejects.toThrow();
    await expect(upsertCompte({ ...compte, uid: 'x"})' })).rejects.toThrow();
  });
});

describe('rate limit par utilisateur (X-Forwarded-For falsifié)', () => {
  it('/api/refresh reste limité pour un même uid malgré des IP forgées', async () => {
    const app = createApp({ env: { NODE_ENV: 'test', FIREBASE_PROJECT_ID: 'p', TRUST_PROXY: '1' }, verify, scraper, history, comptes, log: silence });
    const srv = await new Promise(r => { const s = app.listen(0, () => r(s)); });
    try {
      const url = `http://127.0.0.1:${srv.address().port}/api/refresh`;
      const statuts = [];
      for (let i = 1; i <= 9; i++) {
        const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer tokengoogle0000', 'X-Forwarded-For': `9.9.9.${i}` } });
        statuts.push(r.status);
      }
      expect(statuts).toContain(429);
    } finally {
      srv.close();
    }
  });
});
