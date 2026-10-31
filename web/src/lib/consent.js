/* Choix de consentement mémorisé 12 mois (cookie de préférence, repli localStorage). */
import { ecrireLocal, lireLocal } from './storage.js';

const CLE = 'pk_consent';
export const DUREE_MS = 365 * 24 * 3600 * 1000;

export function serialiser(choix, now = Date.now()) {
  return JSON.stringify({ c: choix, exp: now + DUREE_MS });
}

/* Retourne 'accepted' | 'refused' | null (absent, invalide ou expiré). */
export function analyser(brut, now = Date.now()) {
  try {
    const o = JSON.parse(brut);
    if ((o.c === 'accepted' || o.c === 'refused') && typeof o.exp === 'number' && o.exp > now) return o.c;
  } catch {
    /* ignoré */
  }
  return null;
}

function lireCookie() {
  try {
    const m = document.cookie.split('; ').find(r => r.startsWith(CLE + '='));
    return m ? decodeURIComponent(m.slice(CLE.length + 1)) : null;
  } catch {
    return null;
  }
}

export function lireConsentement() {
  return analyser(lireCookie()) ?? analyser(lireLocal(CLE));
}

export function enregistrerConsentement(choix) {
  const valeur = serialiser(choix);
  try {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${CLE}=${encodeURIComponent(valeur)}; Max-Age=${DUREE_MS / 1000}; Path=/; SameSite=Lax${secure}`;
  } catch {
    /* cookies indisponibles */
  }
  ecrireLocal(CLE, valeur);
}
