/* Logique d'affichage partagée (et testée) : état d'un parking, formatage. */
import { STATUT_OUVERT } from './config.js';

export const COULEURS_ETAT = { good: '#0ca30c', warn: '#fab219', crit: '#e05252', closed: '#898781' };
export const LIBELLES_ETAT = { good: 'Large', warn: 'Limité', crit: 'Presque complet' };

/* Classe visuelle d'un parking selon son statut et son taux de places libres. */
export function etatParking(statut, places, capacite) {
  if (statut !== STATUT_OUVERT) return 'closed';
  const taux = capacite > 0 ? places / capacite : 0;
  if (taux > 0.5) return 'good';
  if (taux > 0.1) return 'warn';
  return 'crit';
}

/* Entier avec séparateur de milliers à la française (espace simple, comme le Python). */
export function fmtNombre(valeur) {
  return String(Math.trunc(Number(valeur) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/* Tri : ouverts d'abord, puis places décroissantes. */
export function trierParkings(parkings) {
  return [...parkings].sort((a, b) => {
    const oa = a.statut === STATUT_OUVERT ? 1 : 0;
    const ob = b.statut === STATUT_OUVERT ? 1 : 0;
    return ob - oa || b.places - a.places;
  });
}

/* Tuiles : places libres, parkings ouverts, occupation moyenne. */
export function synthese(parkings) {
  const ouverts = parkings.filter(p => p.statut === STATUT_OUVERT);
  const libres = ouverts.reduce((s, p) => s + p.places, 0);
  const capacite = ouverts.reduce((s, p) => s + p.capacite, 0);
  return {
    libres,
    nbOuverts: ouverts.length,
    occupation: capacite ? `${Math.round((1 - libres / capacite) * 100)} %` : '–'
  };
}

/* Occupation en % (0-100, une décimale) à partir des places libres et du total. */
export function occupationPct(dispo, total) {
  if (!total) return 0;
  return Math.round(Math.min(100, Math.max(0, (1 - dispo / total) * 100)) * 10) / 10;
}
