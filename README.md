---
title: Parkings Aix-en-Provence
emoji: 🅿️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 8501
pinned: false
---

# 🅿️ Dashboard Parkings Aix-en-Provence

Disponibilité en temps réel des 9 parkings publics d'Aix-en-Provence (Bellegarde, Cardeurs, Carnot, Méjanes, Mignet, Pasteur, Rambot, Rotonde, Signoret), avec un historique d'occupation collecté toutes les 10 minutes et archivé sur S3.

**Démo :** https://atomik31-dashboard-parking-aix.hf.space/

## La problématique

À Aix-en-Provence, l'information de disponibilité des parkings publics existe… mais elle est éclatée : chaque parking a sa propre page sur les sites de la Semepa (répartis sur deux domaines), sans vue d'ensemble, sans carte, et sans aucun historique. Pour un automobiliste, impossible de répondre en un coup d'œil aux questions utiles : *où reste-t-il de la place près de ma destination ? est-ce que ça vaut le coup de viser les Cardeurs à cette heure-ci, ou est-il toujours plein le samedi matin ?*

Ce projet centralise cette information dispersée en un point unique :

- **une vue consolidée** des 9 parkings (places disponibles, statut, total) au lieu de 9 pages à consulter une par une ;
- **une carte** pour raisonner par destination plutôt que par nom de parking ;
- **un historique** collecté toutes les 10 minutes, qui transforme une donnée volatile (la page Semepa n'affiche que l'instant présent) en une série temporelle exploitable, visualisation des tendances aujourd'hui, analyse des habitudes et prédiction de disponibilité demain.

Le dashboard affiche les places disponibles parking par parking, une carte interactive avec code couleur selon le taux de remplissage, et un graphique d'historique consultable sur 1 h, 6 h, 12 h ou 24 h (en places libres ou en taux d'occupation).

## Architecture

Le projet sépare strictement deux flux de données qui n'ont pas les mêmes contraintes :

```
                       ┌─> Cache Streamlit (TTL 10 min) ──> Affichage temps réel
Sites Semepa ── Scraping (regex)
                       └─> EventBridge ──> Lambda ──> S3 (parkings.csv) ──> Graphique historique
                            rate(10 min)                     └──> RDS / analyse / prédiction (à venir)
```

**Le flux temps réel** vit dans l'application Streamlit : le premier visiteur déclenche un scrape, le résultat est partagé entre toutes les sessions pendant 10 minutes (`st.cache_data`). Si personne ne visite le dashboard, aucune requête n'est envoyée aux sites sources.

**Le flux historique** est totalement découplé de l'application : une fonction AWS Lambda, déclenchée par EventBridge Scheduler toutes les 10 minutes, scrape les 9 parkings et ajoute un relevé au fichier `history/parkings.csv` du bucket S3. Le dashboard n'est qu'un *lecteur* de ce fichier, il peut être en veille, planté ou redéployé sans qu'aucune donnée ne soit perdue.

### Pourquoi Lambda plutôt qu'un cron GitHub Actions ?

La première version de la collecte tournait sur un cron GitHub Actions (`*/10 * * * *`). En pratique, GitHub traite les workflows planifiés en basse priorité : sur une journée de test, seuls 2 déclenchements sur ~30 attendus ont eu lieu. Après un correctif partiel (minutes décalées, relevés groupés), la collecte a été migrée vers EventBridge Scheduler + Lambda, ponctuels à la minute. Le workflow GitHub (`scrape-parkings.yml`) est conservé **désactivé** : c'est le plan de secours, réactivable en un clic si la fonction Lambda devait être indisponible. Règle absolue : **un seul écrivain à la fois**, le fichier étant réécrit à chaque relevé (S3 ne fait pas d'append), deux collecteurs concurrents s'écraseraient mutuellement.

### Le format de l'historique

Un seul fichier CSV, pensé pour être importé tel quel dans une base relationnelle :

| timestamp_utc | date | heure | parking | places_dispo | places_total | statut |
|---|---|---|---|---|---|---|
| 2026-07-03T16:21:14+00:00 | 2026-07-03 | 18:21:14 | Rotonde | 553 | 1800 | ✅ Ouvert |

Le temps est stocké deux fois, et c'est voulu : `timestamp_utc` est la référence canonique (tri, déduplication, fenêtres temporelles, insensible aux changements d'heure), tandis que `date` et `heure` en heure de Paris servent l'analyse métier (« quel taux d'occupation à 11 h ? »). Clé primaire naturelle : `(timestamp_utc, parking)`.

## Gestion des coûts

Volumétrie : ~53 000 relevés/an (6/heure), soit ~475 000 lignes ≈ 40 Mo. Coût AWS total (Lambda + EventBridge + S3) : quelques centimes par an, couvert par le free tier permanent de Lambda.

## Structure du projet

```
Dashboard-parking/
├── dashboard_parking.py            # Point d'entrée Streamlit (UI uniquement)
├── parking_dashboard/              # Package métier, testable sans Streamlit
│   ├── config.py                   # Parkings, constantes, palette du graphique
│   ├── scraper.py                  # Scraping et parsing des pages Semepa
│   └── storage.py                  # Historique CSV sur S3 (dossier local en dev)
├── lambda/
│   ├── lambda_function.py          # Handler AWS Lambda (collecte de production)
│   └── build_zip.sh                # Package de déploiement (cible Linux ARM64)
├── scripts/
│   └── scrape_to_s3.py             # Même collecte en CLI (dev local, fallback CI)
├── .github/workflows/
│   ├── scrape-parkings.yml         # Collecte de secours (désactivée)
│   └── keep-space-awake.yml        # Ping anti-veille du Space HF (2x/jour)
├── tests/                          # Pytest : parsing HTML, stockage, palette
├── notebooks/parking.ipynb         # Exploration initiale du scraping
├── .streamlit/config.toml          # Thème imposé (rendu identique partout)
├── Dockerfile                      # Image non-root, healthcheck (Space HF / VPS)
├── requirements.txt                # Dépendances de production
└── requirements-dev.txt            # + pytest
```

Le cœur du projet est le package `parking_dashboard` : le scraping et le stockage n'importent pas Streamlit, ce qui permet de les réutiliser à l'identique dans trois contextes d'exécution, l'application web, la Lambda, et le script CLI, et de les tester sans réseau.

## Installation locale

```bash
git clone https://github.com/Atomik31/Dashboard-parking.git
cd Dashboard-parking
pip install -r requirements.txt
streamlit run dashboard_parking.py     # http://localhost:8501
```

Sans configuration AWS, le dashboard fonctionne normalement ; seule la section historique affiche « Aucun historique disponible ». Pour la tester sans bucket, le collecteur sait écrire dans un dossier local :

```bash
python -m scripts.scrape_to_s3 --local   # alimente history/ (ignoré par git)
```

### Tests

```bash
pip install -r requirements-dev.txt
python -m pytest
```

Les tests couvrent le parsing HTML (nombre de places, « COMPLET », fermeture, page sans données), la construction des statuts et le cycle d'écriture/lecture de l'historique sans dépendre du réseau ni d'AWS.

## Déploiement

### Dashboard — Hugging Face Space (Docker)

Le Space construit le `Dockerfile` du repo (le front-matter en tête de ce README le configure : `sdk: docker`, `app_port: 8501`). L'image tourne non-root (exigence des Spaces) avec un healthcheck Streamlit. Pour donner au dashboard l'accès en lecture à l'historique : *Settings → Variables and secrets* du Space → `S3_BUCKET`, `AWS_DEFAULT_REGION` (variables), `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (secrets — utilisateur IAM **lecteur**, `s3:GetObject` uniquement).

Les Spaces gratuits s'endorment après 48 h sans trafic : le workflow `keep-space-awake.yml` pingue l'application deux fois par jour, et son échec déclenche un email ce qui en fait aussi une sonde de disponibilité gratuite.

### Dashboard — Docker sur n'importe quelle machine

```bash
docker build -t dashboard-parking .
docker run -d -p 8501:8501 --restart unless-stopped \
  -e S3_BUCKET=dashboard-parking-aix \
  -e AWS_ACCESS_KEY_ID=... \
  -e AWS_SECRET_ACCESS_KEY=... \
  -e AWS_DEFAULT_REGION=eu-west-3 \
  --name dashboard-parking dashboard-parking
```

### Collecte — AWS Lambda + EventBridge

1. **Bucket S3** privé (ex. `dashboard-parking-aix`, région `eu-west-3`), **Versioning activé** : le fichier unique étant réécrit toutes les 10 minutes, le versioning protège d'un écrasement accidentel. Ajouter une règle de cycle de vie qui purge les versions non courantes après 30 jours.
2. **Rôle IAM** pour la fonction : `AWSLambdaBasicExecutionRole` (logs CloudWatch) + politique inline `s3:GetObject`/`s3:PutObject` limitée à `arn:aws:s3:::BUCKET/history/*`. Aucune clé d'accès dans la fonction : les permissions viennent du rôle d'exécution.
3. **Package** : `./lambda/build_zip.sh` produit `dist/lambda-scraper.zip` (le package métier + `requests`, binaires ciblés `manylinux aarch64` ; boto3 est fourni par le runtime).
4. **Fonction** : Python 3.13, architecture arm64, handler `lambda_function.lambda_handler`, timeout 120 s (le scrape prend ~20 s), 128 Mo, variable d'environnement `S3_BUCKET`.
5. **Planification** : EventBridge Scheduler, `rate(10 minutes)`, fenêtre flexible désactivée, cible la fonction.

Suivi dans CloudWatch Logs (`/aws/lambda/scrape-parkings`, rétention 30 jours suffisante).

## Exploiter les données

Le CSV s'importe sans transformation :

```sql
-- PostgreSQL / RDS
COPY parkings FROM '...' CSV HEADER;
```
```python
# pandas
df = pd.read_csv("s3://dashboard-parking-aix/history/parkings.csv")
```
```sql
-- DuckDB
SELECT parking, heure, avg(places_dispo)
FROM read_csv_auto('s3://.../history/parkings.csv')
GROUP BY parking, heure;
```

## Configuration

Tout est centralisé dans `parking_dashboard/config.py` : liste des parkings (URL, capacité, coordonnées GPS), TTL du cache, seuils d'affichage, palette du graphique (9 couleurs fixes, une par parking, validées pour le contraste et le daltonisme sur fond sombre).

Le scraping extrait le nombre de places du HTML Semepa par expression régulière :

```
<p class="nbPlaces"><span[^>]*>(\d+)</span>
```

avec une pause de 0,5 s entre chaque parking pour ménager le site source. Aucune donnée personnelle n'est collectée : uniquement des compteurs publics.

## Roadmap

- [x] Historique des données (graphique temporel)
- [x] Collecte serverless ponctuelle (Lambda + EventBridge)
- [ ] Import RDS et analyse des patterns hebdomadaires
- [ ] Prédiction de disponibilité (ML)
- [ ] CI GitHub Actions (lint + tests)
- [ ] Notifications quand un parking se remplit

## Licence & auteur

Projet open source, libre d'utilisation et de modification.
Créé en décembre 2025 par **Julien CHARLIER** les questions et suggestions sont bienvenues via les issues GitHub.
