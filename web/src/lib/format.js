import { TIMEZONE } from '../../shared/config.js';

export { fmtNombre, etatParking, trierParkings, synthese, occupationPct, COULEURS_ETAT, LIBELLES_ETAT } from '../../shared/parking.js';

const LOCALES = { fr: 'fr-FR', en: 'en-GB' };
const memo = new Map();
/* Formateurs de date (Europe/Paris) par langue, créés une seule fois. */
function formateurs(lang) {
  const locale = LOCALES[lang] ?? LOCALES.fr;
  if (!memo.has(locale)) {
    memo.set(locale, {
      heure: new Intl.DateTimeFormat(locale, { timeZone: TIMEZONE, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }),
      jourHeure: new Intl.DateTimeFormat(locale, { timeZone: TIMEZONE, hourCycle: 'h23', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      jour: new Intl.DateTimeFormat(locale, { timeZone: TIMEZONE, day: '2-digit', month: '2-digit' })
    });
  }
  return memo.get(locale);
}

/* ms epoch -> « HH:MM » (Europe/Paris) */
export const fmtHeure = (ms, lang = 'fr') => formateurs(lang).heure.format(ms);
/* ms epoch -> « JJ/MM HH:MM » (Europe/Paris) */
export const fmtJourHeure = (ms, lang = 'fr') => formateurs(lang).jourHeure.format(ms).replace(',', '');
export const fmtJour = (ms, lang = 'fr') => formateurs(lang).jour.format(ms);
/* Clé de jour (Europe/Paris) pour détecter un changement de jour sur l'axe */
export const cleJour = ms => formateurs('fr').jour.format(ms);

/* Données d'historique brutes [{t, parking, dispo, total}] -> lignes pivotées par horodatage :
   [{ ms, Bellegarde: 123, ... }], avec la mesure choisie. */
export function pivoterHistorique(rows, selection, mesure, occupationPct) {
  const par = new Map();
  for (const r of rows) {
    if (!selection.includes(r.parking)) continue;
    const ms = Date.parse(r.t);
    if (!par.has(ms)) par.set(ms, { ms });
    par.get(ms)[r.parking] = mesure === 'occupation' ? occupationPct(r.dispo, r.total) : r.dispo;
  }
  return [...par.values()].sort((a, b) => a.ms - b.ms);
}

/* Décalage de Paris par rapport à UTC (ms) à un instant donné, pour aligner les graduations sur les heures locales. */
function decalageParis(ms) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(ms);
  const h = Number(parts.find(p => p.type === 'hour').value);
  const m = Number(parts.find(p => p.type === 'minute').value);
  const utc = new Date(ms);
  let d = (h * 60 + m - (utc.getUTCHours() * 60 + utc.getUTCMinutes())) * 60_000;
  if (d > 12 * 3600_000) d -= 24 * 3600_000;
  if (d < -12 * 3600_000) d += 24 * 3600_000;
  return d;
}

/* Graduations de l'axe X : pas régulier selon la plage (en heures), alignées sur l'heure de Paris. */
export function graduations(donnees, heures) {
  if (!donnees.length) return [];
  const min = donnees[0].ms;
  const max = donnees[donnees.length - 1].ms;
  const pas = (heures <= 1 ? 10 : heures <= 6 ? 60 : heures <= 12 ? 120 : 180) * 60_000;
  const d = decalageParis(min);
  const ticks = [];
  for (let t = Math.ceil((min + d) / pas) * pas - d; t <= max; t += pas) ticks.push(t);
  return ticks;
}
