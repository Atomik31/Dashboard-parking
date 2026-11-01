/* Indicateurs dérivés de l'historique et des relevés en direct (fonctions pures, testées). */
import { STATUT_OUVERT } from '../../shared/config.js';

export const TENDANCE_MS = 30 * 60 * 1000;
export const TENDANCE_TOLERANCE_MS = 12 * 60 * 1000;

/* Taux d'occupation 0-100 (entier) des parkings ouverts, ou null s'il n'y en a aucun. */
export function occupationEntiere(parkings) {
  const ouverts = parkings.filter(p => p.statut === STATUT_OUVERT);
  const capacite = ouverts.reduce((s, p) => s + p.capacite, 0);
  if (!capacite) return null;
  const libres = ouverts.reduce((s, p) => s + p.places, 0);
  return Math.round((1 - libres / capacite) * 100);
}

/* Parking ouvert avec le plus de places libres (ou null). */
export function meilleurChoix(parkings) {
  const ouverts = parkings.filter(p => p.statut === STATUT_OUVERT);
  return ouverts.length ? ouverts.reduce((m, p) => (p.places > m.places ? p : m)) : null;
}

/* Total de places libres par relevé : [{ ms, total }] trié par date (courbe du bandeau d'indicateurs). */
export function serieTotale(rows) {
  const par = new Map();
  for (const r of rows ?? []) {
    const ms = Date.parse(r.t);
    if (!Number.isFinite(ms) || !Number.isFinite(r.dispo)) continue;
    par.set(ms, (par.get(ms) ?? 0) + r.dispo);
  }
  return [...par.entries()].sort((a, b) => a[0] - b[0]).map(([ms, total]) => ({ ms, total }));
}

/* Évolution des places libres d'un parking sur ~30 min : places actuelles moins celles du relevé le plus proche de
   « maintenant - 30 min » (à ± tolérance). null si l'historique ne couvre pas cet instant. */
export function tendance30(rows, nom, placesNow, nowMs, { cible = TENDANCE_MS, tolerance = TENDANCE_TOLERANCE_MS } = {}) {
  const visee = nowMs - cible;
  let meilleur = null;
  let ecart = Infinity;
  for (const r of rows ?? []) {
    if (r.parking !== nom) continue;
    const ms = Date.parse(r.t);
    if (!Number.isFinite(ms)) continue;
    const e = Math.abs(ms - visee);
    if (e < ecart) {
      ecart = e;
      meilleur = r;
    }
  }
  if (!meilleur || ecart > tolerance) return null;
  return placesNow - meilleur.dispo;
}

/* Initiale affichée dans l'avatar. */
export function initiale(email) {
  const c = String(email ?? '').trim()[0];
  return c ? c.toLocaleUpperCase('fr-FR') : '?';
}
