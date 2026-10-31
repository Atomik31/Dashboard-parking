/* Scraping des pages Semepa : port de parking_dashboard/scraper.py.
   Seules les URLs de shared/config.js sont interrogées (pas de SSRF) : aucune entrée utilisateur n'entre dans l'URL. */
import {
  DELAI_ENTRE_REQUETES_MS,
  PARKINGS,
  REQUEST_HEADERS,
  REQUEST_TIMEOUT_MS,
  SEUIL_COMPLET,
  STATUT_ERREUR,
  STATUT_OUVERT,
  STATUT_SANS_DONNEES,
  TIMEZONE
} from '../shared/config.js';

export const RE_NB_PLACES = /<p class="nbPlaces"><span[^>]*>(\d+)<\/span>/;
export const RE_TEXTE_PLACES = /<p class="nbPlaces"><span[^>]*>([^<]+)<\/span>/;

const HOTES_AUTORISES = new Set(PARKINGS.map(p => new URL(p.baseUrl).hostname));
const TAILLE_MAX_HTML = 2_000_000;
const REDIRECTIONS_MAX = 3;
const LONGUEUR_MAX_TEXTE = 80;

/* Extrait [places, null] si un nombre est trouvé, [null, texte] si la page affiche un texte, [null, null] sinon. */
export function parsePlaces(html) {
  const nombre = RE_NB_PLACES.exec(html);
  if (nombre) return [parseInt(nombre[1], 10), null];
  const texte = RE_TEXTE_PLACES.exec(html);
  if (texte) return [null, texte[1].trim()];
  return [null, null];
}

const formatHeure = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TIMEZONE,
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});
export const horodatage = (date = new Date()) => formatHeure.format(date);

function entree(parking, places, affichage, statut, date) {
  return {
    nom: parking.nom,
    places,
    capacite: parking.capacite,
    affichage,
    statut,
    timestamp: horodatage(date),
    latitude: parking.latitude,
    longitude: parking.longitude
  };
}

/* Construit l'entrée d'un parking à partir du résultat du parsing. */
export function construireEntree(parking, places, texte, date = new Date()) {
  if (places !== null && places !== undefined) {
    if (places <= SEUIL_COMPLET) return entree(parking, places, 'COMPLET', STATUT_OUVERT, date);
    return entree(parking, places, `${places} / ${parking.capacite}`, STATUT_OUVERT, date);
  }
  if (texte !== null && texte !== undefined) {
    const propre = texte.slice(0, LONGUEUR_MAX_TEXTE);
    if (propre.toUpperCase() === 'COMPLET') return entree(parking, 0, 'COMPLET', STATUT_OUVERT, date);
    /* Texte non numérique : message de fermeture ou d'indisponibilité */
    return entree(parking, 0, propre, `⚠️ ${propre}`, date);
  }
  return entree(parking, 0, 'N/A', STATUT_SANS_DONNEES, date);
}

/* GET avec redirections suivies à la main, uniquement vers les hôtes de la configuration. */
async function recuperer(url, fetchImpl) {
  let courante = url;
  for (let i = 0; i <= REDIRECTIONS_MAX; i++) {
    const res = await fetchImpl(courante, {
      headers: REQUEST_HEADERS,
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const cible = new URL(res.headers.get('location'), courante);
      if (cible.protocol !== 'https:' || !HOTES_AUTORISES.has(cible.hostname)) throw new Error('redirection refusée');
      courante = cible.toString();
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (html.length > TAILLE_MAX_HTML) throw new Error('réponse trop volumineuse');
    return html;
  }
  throw new Error('trop de redirections');
}

/* Récupère la page d'un parking et en extrait les données. Ne lève jamais : une erreur devient une entrée « Erreur ». */
export async function scrapeParking(parking, { fetchImpl = fetch, log = console } = {}) {
  const url = new URL(parking.baseUrl);
  url.searchParams.set('page_id', String(parking.pageId));
  try {
    const html = await recuperer(url.toString(), fetchImpl);
    const [places, texte] = parsePlaces(html);
    return construireEntree(parking, places, texte);
  } catch (err) {
    log.warn(`Échec de la requête pour ${parking.nom}: ${err.message}`);
    return entree(parking, 0, 'Erreur', STATUT_ERREUR, new Date());
  }
}

const pause = ms => new Promise(r => setTimeout(r, ms));

/* Scrape tous les parkings, avec une pause entre chaque requête. */
export async function scrapeAll({ fetchImpl = fetch, delaiMs = DELAI_ENTRE_REQUETES_MS, log = console } = {}) {
  log.info(`Scraping de ${PARKINGS.length} parkings...`);
  const parkings = [];
  for (const parking of PARKINGS) {
    parkings.push(await scrapeParking(parking, { fetchImpl, log }));
    if (delaiMs > 0) await pause(delaiMs);
  }
  log.info('Scraping terminé.');
  return { updatedAt: new Date().toISOString(), updatedAtLabel: horodatage(), parkings };
}
