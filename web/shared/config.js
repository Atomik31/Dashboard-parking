/* Configuration partagée serveur / client : parkings surveillés et constantes.
   Port de parking_dashboard/config.py (la source de vérité du scraping reste ce fichier côté web). */

export const PARKINGS = [
  { nom: 'Bellegarde', baseUrl: 'https://mamp.parkings-semepa.fr/', pageId: 213, capacite: 340, latitude: 43.5322096, longitude: 5.45021 },
  { nom: 'Cardeurs', baseUrl: 'https://mamp.parkings-semepa.fr/', pageId: 219, capacite: 125, latitude: 43.5298981, longitude: 5.4458118 },
  { nom: 'Carnot', baseUrl: 'https://mamp.parkings-semepa.fr/', pageId: 211, capacite: 675, latitude: 43.5255598, longitude: 5.4554612 },
  { nom: 'Méjanes', baseUrl: 'https://mamp.parkings-semepa.fr/', pageId: 150, capacite: 800, latitude: 43.5239974, longitude: 5.4413805 },
  { nom: 'Mignet', baseUrl: 'https://mamp.parkings-semepa.fr/', pageId: 209, capacite: 800, latitude: 43.52425, longitude: 5.4476974 },
  { nom: 'Pasteur', baseUrl: 'https://mamp.parkings-semepa.fr/', pageId: 215, capacite: 650, latitude: 43.5339951, longitude: 5.4462335 },
  { nom: 'Rambot', baseUrl: 'https://parkings-semepa.fr/', pageId: 221, capacite: 400, latitude: 43.5304833, longitude: 5.4580851 },
  { nom: 'Rotonde', baseUrl: 'https://parkings-semepa.fr/', pageId: 206, capacite: 1800, latitude: 43.5253922, longitude: 5.4440594 },
  { nom: 'Signoret', baseUrl: 'https://mamp.parkings-semepa.fr/', pageId: 217, capacite: 350, latitude: 43.5333509, longitude: 5.4486254 }
];

export const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};
export const REQUEST_TIMEOUT_MS = 5000;
/* Pause entre deux requêtes pour ménager le site source */
export const DELAI_ENTRE_REQUETES_MS = 500;
/* Durée de vie du cache mémoire partagé entre tous les visiteurs */
export const CACHE_TTL_SECONDES = 600;
export const TIMEZONE = 'Europe/Paris';
/* En dessous de ce nombre de places, le parking est affiché comme complet */
export const SEUIL_COMPLET = 2;
/* Centre de la carte (Aix-en-Provence) et zoom initial */
export const CENTRE_CARTE = [43.52829276, 5.4525416];
export const ZOOM_CARTE = 15;

/* Couleur fixe par parking pour le graphique (même ordre que PARKINGS) */
export const COULEURS_SERIES = ['#3987e5', '#e66767', '#1795a9', '#d95926', '#9085e9', '#009f00', '#d55181', '#c98500', '#199e70'];

/* Plages d'affichage de l'historique (libellé -> nombre d'heures) */
export const PLAGES_HISTORIQUE = { '1 h': 1, '6 h': 6, '12 h': 12, '24 h': 24 };
export const HEURES_AUTORISEES = Object.values(PLAGES_HISTORIQUE);

export const STATUT_OUVERT = '✅ Ouvert';
export const STATUT_SANS_DONNEES = '❓ Pas de données';
export const STATUT_ERREUR = '❌ Erreur';
