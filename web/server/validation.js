/* Validation stricte de toutes les entrées de l'API (listes blanches). */
import { HEURES_AUTORISEES } from '../shared/config.js';

export const HEURES_DEFAUT = 6;

/* `hours` : absent -> défaut ; sinon une chaîne exactement égale à une valeur autorisée. Retourne null si invalide. */
export function parseHeures(valeur) {
  if (valeur === undefined) return HEURES_DEFAUT;
  if (typeof valeur !== 'string' || !/^\d{1,2}$/.test(valeur)) return null;
  const n = Number(valeur);
  return HEURES_AUTORISEES.includes(n) && String(n) === valeur ? n : null;
}

export const LANGUES = ['fr', 'en'];
export function parseLangue(valeur) {
  return typeof valeur === 'string' && LANGUES.includes(valeur) ? valeur : 'fr';
}

export const UID_RE = /^[A-Za-z0-9:_-]{1,128}$/;
export function uidValide(uid) {
  return typeof uid === 'string' && UID_RE.test(uid);
}

/* Méthode d'inscription déduite UNIQUEMENT du jeton (sign_in_provider), jamais du corps de la requête. */
export function methodeDepuisProvider(provider) {
  if (provider === 'google.com') return 'Google';
  if (provider === 'password') return 'E-mail';
  return null;
}

const EMAIL_RE = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,255}$/;
export function emailValide(email) {
  return typeof email === 'string' && email.length <= 320 && EMAIL_RE.test(email);
}
