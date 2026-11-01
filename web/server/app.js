/* Application Express : API sécurisée + service du front (web/dist) en production. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { CACHE_TTL_SECONDES } from '../shared/config.js';
import { upsertCompte } from './airtable.js';
import { assertConfigSure, bypassActif, createDevVerifier, createTokenVerifier, requireAuth } from './auth.js';
import { createTtlCache } from './cache.js';
import { createHistoryService } from './history.js';
import { apercuPublic } from './public.js';
import { scrapeAll } from './scraper.js';
import { emailValide, methodeDepuisProvider, parseHeures, parseLangue } from './validation.js';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const INTERVALLE_MIN_REFRESH_MS = 30_000;

export function construireCsp(env, production) {
  const authDomain = env.FIREBASE_AUTH_DOMAIN || env.VITE_FIREBASE_AUTH_DOMAIN;
  const frames = ["'self'", 'https://*.firebaseapp.com', 'https://accounts.google.com', 'https://apis.google.com'];
  if (authDomain && /^[a-z0-9.-]+$/i.test(authDomain)) frames.push(`https://${authDomain}`);
  const directives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://apis.google.com'],
    /* styles en ligne : attributs style de React/Recharts et des pastilles Leaflet (DivIcon) */
    styleSrc: ["'self'"],
    styleSrcAttr: ["'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'blob:', 'https://*.google.com', 'https://*.gstatic.com', 'https://*.googleapis.com'],
    fontSrc: ["'self'", 'data:'],
    connectSrc: ["'self'", 'https://*.googleapis.com', 'https://apis.google.com', 'https://*.firebaseapp.com'],
    frameSrc: frames,
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    workerSrc: ["'self'", 'blob:']
  };
  if (production) directives.upgradeInsecureRequests = [];
  else directives.upgradeInsecureRequests = null;
  return directives;
}

const limiteur = (windowMs, limit) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Trop de requêtes, réessaie plus tard.' } });

/* limite par utilisateur authentifié : indépendante de l'IP / de X-Forwarded-For */
const limiteurUtilisateur = (windowMs, limit) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, keyGenerator: req => `uid:${req.user?.uid ?? 'anonyme'}`, message: { error: 'Trop de requêtes, réessaie plus tard.' } });

export function createApp({ env = process.env, verify, scraper, history, comptes = upsertCompte, log = console, staticDir } = {}) {
  assertConfigSure(env);
  const production = env.NODE_ENV === 'production';

  const verifier =
    verify ?? (bypassActif(env) ? createDevVerifier() : createTokenVerifier({ projectId: env.FIREBASE_PROJECT_ID || '' }));
  if (!verify && !bypassActif(env) && !env.FIREBASE_PROJECT_ID) {
    log.warn('FIREBASE_PROJECT_ID absent : toutes les routes protégées seront refusées (503).');
  }
  if (bypassActif(env)) log.warn('AUTH_DEV_BYPASS actif : authentification désactivée (développement uniquement).');

  const parkingsCache = createTtlCache({ ttlMs: CACHE_TTL_SECONDES * 1000, loader: scraper ?? (() => scrapeAll({ log })) });
  const historique = history ?? createHistoryService({ env });
  const auth = requireAuth(verifier);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY === undefined ? 1 : Number(env.TRUST_PROXY) || 0);

  app.use(
    helmet({
      contentSecurityPolicy: { useDefaults: false, directives: construireCsp(env, production) },
      /* la popup Google de Firebase a besoin de window.opener */
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginEmbedderPolicy: false,
      hsts: production ? undefined : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    })
  );

  /* CORS fermé : aucune origine autorisée sauf liste explicite CORS_ORIGINS (le front est servi par le même serveur / proxy Vite) */
  const origines = (env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  app.use('/api', cors({ origin: origines.length ? origines : false, methods: ['GET', 'POST'], allowedHeaders: ['Authorization', 'Content-Type'] }));

  app.use('/api', limiteur(60_000, 120));
  app.use(express.json({ limit: '4kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  /* Aperçu public pour la page de connexion : lit le même cache partagé (donc au plus un scraping de la source par TTL,
     quel que soit le nombre de visiteurs), champs en liste blanche, limite par IP dédiée. */
  app.get('/api/public/live', limiteur(60_000, 30), async (_req, res) => {
    try {
      res.set('Cache-Control', 'public, max-age=60');
      res.json(apercuPublic(await parkingsCache.get()));
    } catch (err) {
      log.error(`Aperçu public indisponible: ${err.message}`);
      res.status(502).json({ error: 'Aperçu indisponible' });
    }
  });

  app.get('/api/parkings', auth, async (_req, res, next) => {
    try {
      res.set('Cache-Control', 'no-store');
      res.json(await parkingsCache.get());
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/refresh', limiteur(60_000, 6), auth, limiteurUtilisateur(60_000, 6), async (_req, res, next) => {
    try {
      res.set('Cache-Control', 'no-store');
      res.json(await parkingsCache.refresh(INTERVALLE_MIN_REFRESH_MS));
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/history', auth, async (req, res, next) => {
    const heures = parseHeures(req.query.hours);
    if (heures === null) return res.status(400).json({ error: 'Paramètre hours invalide (1, 6, 12 ou 24)' });
    try {
      res.set('Cache-Control', 'no-store');
      res.json({ hours: heures, rows: await historique.get(heures) });
    } catch (err) {
      log.error(`Lecture de l'historique impossible: ${err.message}`);
      res.status(502).json({ error: "Historique indisponible" });
    }
  });

  app.post('/api/signup', limiteur(15 * 60_000, 20), auth, limiteurUtilisateur(15 * 60_000, 20), async (req, res) => {
    const { uid, email, provider } = req.user;
    const methode = methodeDepuisProvider(provider);
    if (!methode || !emailValide(email)) return res.status(400).json({ error: 'Compte non pris en charge' });
    const langue = parseLangue(req.body?.lang);
    try {
      const resultat = await comptes({ token: env.AIRTABLE_TOKEN, email: email.toLowerCase(), uid, methode, langue });
      res.json({ ok: true, result: resultat });
    } catch (err) {
      /* On ne bloque pas l'accès : le client retentera à la prochaine connexion */
      log.error(`Enregistrement Airtable impossible: ${err.message}`);
      res.status(502).json({ ok: false, error: 'Enregistrement indisponible' });
    }
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Introuvable' }));

  /* Front compilé (production) */
  const dist = staticDir ?? path.join(RACINE, 'dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist, { index: false, maxAge: '1h', setHeaders: (r, p) => p.endsWith('index.html') && r.setHeader('Cache-Control', 'no-cache') }));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  /* eslint-disable-next-line no-unused-vars */
  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Requête trop volumineuse' });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Requête invalide' });
    log.error(`Erreur: ${err?.message ?? err}`);
    res.status(500).json({ error: 'Erreur interne' });
  });

  return app;
}
