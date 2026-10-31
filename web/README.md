# Dashboard Parkings Aix-en-Provence : version React

Migration du dashboard Streamlit (`../dashboard_parking.py`, toujours en production) vers une vraie application web : front **Vite + React**, back **Node/Express**, authentification **Firebase**, enregistrement des comptes dans **Airtable**. Le dossier `web/` est autonome ; le code Python reste inchangé (la Lambda continue d'alimenter l'historique S3).

## Démarrage

Prérequis : Node 22.9+.

```bash
cd web
npm install
cp .env.example .env        # puis renseigner les valeurs (voir ci-dessous)
npm run dev                 # API http://localhost:3000 + front http://localhost:5173 (proxy /api)
npm test                    # tests vitest
npm run build && NODE_ENV=production npm start   # production locale : Express sert dist/ sur :3000
```

### Mode développement sans Firebase (local uniquement)

Pour voir le dashboard sans se connecter :

- `web/.env` : `AUTH_DEV_BYPASS=1` (le serveur accepte alors `Authorization: Bearer dev-bypass`) ;
- `web/.env.development` : `VITE_AUTH_MODE=dev` (le front saute l'écran de connexion ; chargé uniquement par `npm run dev`).

Garde-fous : le serveur **refuse de démarrer** si `AUTH_DEV_BYPASS` est actif avec `NODE_ENV=production` ; `vite build` **échoue** si `VITE_AUTH_MODE=dev` ; le mode dev du front est inerte dans un build (`import.meta.env.DEV`). Sans ces variables, l'authentification Firebase est obligatoire. Ne jamais les définir sur le VPS.

## Variables d'environnement

| Variable | Où | Rôle |
|---|---|---|
| `FIREBASE_PROJECT_ID` | serveur | Projet Firebase attendu dans les jetons (`iss`/`aud`). **Absent = tout est refusé.** |
| `FIREBASE_AUTH_DOMAIN` | serveur | (optionnel) ajoute le domaine d'auth à la CSP |
| `AIRTABLE_TOKEN` | serveur, **secret** | PAT Airtable (écriture sur la base `appHnOPUpb7FbokMj`, table `tblquStqPWLSz41gj`). Jamais côté client. |
| `S3_BUCKET`, `AWS_DEFAULT_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | serveur, **secret** | Lecture de `history/parkings.csv` (IAM lecteur, `s3:GetObject`). Sans `S3_BUCKET` : dossier local `HISTORY_DIR` (défaut `history/`). |
| `HISTORY_DIR` | serveur | Dossier local de repli (ex. `../history`, alimenté par `python -m scripts.scrape_to_s3 --local`) |
| `CORS_ORIGINS` | serveur | Origines autorisées (vide = CORS fermé, same-origin) |
| `TRUST_PROXY` | serveur | Nombre de proxys de confiance pour le rate limit (1 derrière Traefik) |
| `PORT` | serveur | Port (3000) |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | client (build) | Config web Firebase (valeurs publiques par nature) |

## Architecture

```
web/
├── shared/            config.js (parkings, constantes) + parking.js (état, formatage) : partagés client/serveur
├── server/            Express (ESM)
│   ├── app.js         helmet (CSP), CORS fermé, rate limits, routes, service de dist/
│   ├── auth.js        vérif. jeton Firebase (jose + JWKS securetoken), garde-fou bypass
│   ├── scraper.js     port du scraper Python (regex, statuts, délai 0,5 s, timeout 5 s)
│   ├── history.js     lecture CSV S3 / local, cache 5 min
│   ├── airtable.js    upsert « Comptes » par UID Firebase
│   ├── cache.js       cache TTL (600 s) avec single-flight
│   └── validation.js  listes blanches (hours, lang, uid, provider)
├── src/               React : pages/ (Dashboard, Login, Legal, 404), components/, hooks/, lib/, styles/
├── tests/             vitest
├── Dockerfile                        (image de production, voir « Déploiement »)
```

API (toutes sauf `health` exigent `Authorization: Bearer <idToken Firebase>`, sinon 401) :

- `GET /api/health`
- `GET /api/parkings` : données scrapées, cache mémoire 600 s partagé
- `POST /api/refresh` : force un nouveau scraping (6 req/min/IP ; pas plus d'un scraping réel toutes les 30 s)
- `GET /api/history?hours=1|6|12|24`
- `POST /api/signup` : upsert Airtable (`Email`, `UID Firebase`, `Méthode` déduite du `sign_in_provider` du jeton, `Langue` fr/en, `Créé le` seulement à la création). En cas d'échec Airtable : 502, journalisé, l'accès n'est pas bloqué et le client retente à la connexion suivante (flag localStorage).

Sécurité : CSP stricte (helmet), CORS fermé, `express-rate-limit` (120/min global, plus strict sur refresh et signup), corps JSON limité à 4 ko, entrées en liste blanche, erreurs génériques sans stack, scraper restreint aux URLs de `shared/config.js` (redirections suivies seulement vers ces hôtes), aucun `dangerouslySetInnerHTML`, aucun secret dans le code. Polices auto-hébergées (pas d'appel à Google Fonts).

## À configurer côté Firebase (console)

1. Authentication > Méthode de connexion : activer **Google** et **E-mail/Mot de passe**.
2. Authentication > Paramètres > Domaines autorisés : `localhost` et `parking-aixpress.fr` (+ `www.parking-aixpress.fr`).
3. (Recommandé) Paramètres du projet > App Check, et restreindre la clé API web aux domaines autorisés (Google Cloud > Identifiants).
4. Personnaliser le modèle d'e-mail de réinitialisation de mot de passe (français).

## Déploiement (VPS)

Tout passe par GitHub. Le `docker-compose.yml` **à la racine du dépôt** construit cette app (`#main:web`) et porte les labels Traefik. Sur le VPS (`/docker/dashboard-parking`), un cron exécute `autodeploy.sh` toutes les 5 minutes : si le dernier commit de `main` diffère de `.deployed-commit`, `deploy.sh` récupère le compose, puis `docker compose up -d --build`. Un `git push` sur `main` suffit donc à mettre le site à jour ; un `git revert` pousse un retour arrière.

Les secrets ne sont jamais dans le dépôt : ils sont dans `/docker/dashboard-parking/.env` sur le VPS (`S3_BUCKET`, `AWS_DEFAULT_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AIRTABLE_TOKEN`, `FIREBASE_PROJECT_ID`).

## Textes juridiques

`src/lib/legal.js` contient CGU, politique de confidentialité et mentions légales (RGPD) : modèle à relire (adresse de l'éditeur, durées de conservation, coordonnées des sous-traitants).
