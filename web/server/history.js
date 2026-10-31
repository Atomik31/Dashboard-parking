/* Lecture de l'historique (history/parkings.csv) : S3 si S3_BUCKET est défini, sinon dossier local HISTORY_DIR.
   Port de parking_dashboard/storage.py (lecture seule). Schéma CSV :
   timestamp_utc,date,heure,parking,places_dispo,places_total,statut */
import fs from 'node:fs/promises';
import path from 'node:path';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createTtlCache } from './cache.js';

export const CLE_S3 = 'history/parkings.csv';
export const FENETRE_MAX_HEURES = 24;
export const TTL_HISTORIQUE_MS = 5 * 60 * 1000;

/* Analyse d'une ligne CSV (guillemets RFC 4180 gérés). */
export function parseLigneCsv(ligne) {
  const champs = [];
  let courant = '';
  let entreGuillemets = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (entreGuillemets) {
      if (c === '"' && ligne[i + 1] === '"') {
        courant += '"';
        i++;
      } else if (c === '"') entreGuillemets = false;
      else courant += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === ',') {
      champs.push(courant);
      courant = '';
    } else courant += c;
  }
  champs.push(courant);
  return champs;
}

/* Retourne les lignes dont l'horodatage est dans [debut, fin], triées chronologiquement :
   [{ t: ISO UTC, parking, dispo, total }]. Les lignes invalides sont ignorées. */
export function parseHistorique(csv, debut, fin) {
  const lignes = csv.split(/\r?\n/);
  const entete = parseLigneCsv(lignes[0] ?? '');
  const idx = nom => entete.indexOf(nom);
  const iT = idx('timestamp_utc');
  const iP = idx('parking');
  const iD = idx('places_dispo');
  const iN = idx('places_total');
  if ([iT, iP, iD, iN].includes(-1)) return [];
  const lignesOk = [];
  for (let i = 1; i < lignes.length; i++) {
    if (!lignes[i]) continue;
    const c = parseLigneCsv(lignes[i]);
    const ms = Date.parse(c[iT]);
    const dispo = Number(c[iD]);
    const total = Number(c[iN]);
    if (!Number.isFinite(ms) || !Number.isFinite(dispo) || !Number.isFinite(total) || !c[iP]) continue;
    if (ms < debut || ms > fin) continue;
    lignesOk.push({ ms, t: new Date(ms).toISOString(), parking: c[iP], dispo, total });
  }
  lignesOk.sort((a, b) => a.ms - b.ms);
  return lignesOk.map(({ t, parking, dispo, total }) => ({ t, parking, dispo, total }));
}

async function lireCsvS3(env) {
  const client = new S3Client({ region: env.AWS_DEFAULT_REGION || 'eu-west-3' });
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: CLE_S3 }));
    return await res.Body.transformToString('utf-8');
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

async function lireCsvLocal(env) {
  const dossier = env.HISTORY_DIR || 'history';
  try {
    return await fs.readFile(path.resolve(dossier, 'parkings.csv'), 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/* `lireCsv` est injectable pour les tests. Le CSV est lu et analysé au plus une fois par TTL (fenêtre 24 h). */
export function createHistoryService({ env = process.env, lireCsv, ttlMs = TTL_HISTORIQUE_MS, now = () => Date.now() } = {}) {
  const lecteur = lireCsv ?? (() => (env.S3_BUCKET ? lireCsvS3(env) : lireCsvLocal(env)));
  const cache = createTtlCache({
    ttlMs,
    now,
    loader: async () => {
      const csv = await lecteur();
      const fin = now();
      return csv ? parseHistorique(csv, fin - FENETRE_MAX_HEURES * 3600_000, fin) : [];
    }
  });
  return {
    async get(heures) {
      const rows = await cache.get();
      const debut = now() - heures * 3600_000;
      return rows.filter(r => Date.parse(r.t) >= debut);
    },
    clear: cache.clear
  };
}
