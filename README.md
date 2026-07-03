#🅿️ Dashboard Parkings Aix-en-Provence

Un dashboard web en temps réel pour consulter la disponibilité des places de parking à Aix-en-Provence.

## 📸 Aperçu

Le dashboard affiche :
- **9 parkings** gérés par Semepa (Bellegarde, Cardeurs, Carnot, Méjanes, Mignet, Pasteur, Rambot, Rotonde, Signoret)
- **Places disponibles** actualisées automatiquement
- **Total des places** disponibles en temps réel
- **Statut** de chaque parking (Ouvert, Fermeture temporaire, etc.)
- **Carte interactive** avec code couleur selon le taux de remplissage
- **Graphique d'historique** (1 h / 6 h / 12 h / 24 h) alimenté par les relevés archivés sur S3
- **Dernière mise à jour** des données

## 🚀 Déploiement

Le dashboard est déployé sur **Streamlit Cloud** et accessible gratuitement :

```
https://atomik31-dashboard-parking-aix.hf.space/
```

## 📦 Installation locale

1. **Cloner le repo**
```bash
git clone https://github.com/Atomik31/Dashboard-parking.git
cd Dashboard-parking
```

2. **Installer les dépendances**
```bash
pip install -r requirements.txt
```

3. **Lancer le dashboard**
```bash
python -m streamlit run dashboard_parking.py
```

4. **Accéder au dashboard**
```
http://localhost:8501
```

## 🐳 Déploiement avec Docker

Le projet est conteneurisé : il se déploie à l'identique sur n'importe quelle machine disposant de Docker (serveur perso, VPS, cloud...), sans installer Python ni les dépendances.

### Construire l'image

```bash
docker build -t dashboard-parking .
```

### Lancer le conteneur

```bash
docker run -d -p 8501:8501 --name dashboard-parking --restart unless-stopped dashboard-parking
```

Le dashboard est alors accessible sur `http://localhost:8501` (ou `http://IP_DU_SERVEUR:8501` depuis l'extérieur).

Options utilisées :
- `-d` — exécution en arrière-plan (détaché)
- `-p 8501:8501` — expose le port du dashboard sur la machine hôte
- `--restart unless-stopped` — redémarrage automatique après un reboot ou un crash

### Commandes utiles

```bash
docker logs -f dashboard-parking      # Suivre les logs (scraping, erreurs)
docker ps                             # Vérifier l'état (healthy grâce au HEALTHCHECK)
docker stop dashboard-parking         # Arrêter le conteneur
docker rm dashboard-parking           # Supprimer le conteneur
```

### Mettre à jour après une modification du code

```bash
docker stop dashboard-parking && docker rm dashboard-parking
docker build -t dashboard-parking .
docker run -d -p 8501:8501 --name dashboard-parking --restart unless-stopped dashboard-parking
```

### Déployer sur un serveur distant

```bash
# Sur le serveur (avec Docker installé) :
git clone https://github.com/Atomik31/Dashboard-parking.git
cd Dashboard-parking
docker build -t dashboard-parking .
docker run -d -p 8501:8501 --name dashboard-parking --restart unless-stopped dashboard-parking
```

## 🛠️ Comment ça marche

**1. 🕷️ Scraping** (`parking_dashboard/scraper.py`)
- Récupère les pages HTML des sites Semepa
- Parse le HTML avec des expressions régulières (regex)
- Extrait le nombre de places disponibles et le statut de chaque parking

**2. 📦 Cache** (`st.cache_data`)
- Le résultat du scraping est mis en cache **10 minutes** côté serveur
- Le cache est partagé entre tous les visiteurs : un seul scrape par période, quel que soit le nombre de sessions
- Le bouton « Rafraîchir maintenant » invalide le cache et force un nouveau scrape

**3. 📊 Affichage** (`dashboard_parking.py`)
- Métriques globales, cartes par parking, carte interactive Folium et graphique d'historique

**4. 🗄️ Historique** (`.github/workflows/scrape-parkings.yml` + `parking_dashboard/storage.py`)
- Un workflow GitHub Actions scrape toutes les 10 minutes, indépendamment du dashboard
- Chaque relevé est ajouté à un CSV journalier sur un bucket S3 (`history/AAAA-MM-JJ.csv`)
- Le dashboard lit cet historique pour tracer les variations d'occupation

```
                    ┌─> Cache Streamlit (TTL 10 min) ──> Affichage temps réel
Sites Semepa ── Scraping HTML ── Extraction Regex
                    └─> GitHub Actions (cron 10 min) ──> S3 (CSV/jour) ──> Graphique historique
```

### Technologies utilisées

- **Requests** — récupération des pages web
- **Regex** — extraction des données
- **Pandas** — mise en forme des données
- **Streamlit** — dashboard web et cache des données
- **Folium** — carte interactive
- **Plotly** — graphique d'historique interactif
- **GitHub Actions + boto3 / S3** — collecte planifiée et archivage de l'historique
- **Pytest** — tests unitaires (parsing, stockage)

## 📊 Structure du projet

```
Dashboard-parking/
├── dashboard_parking.py            # Point d'entrée Streamlit (UI uniquement)
├── parking_dashboard/              # Package métier
│   ├── __init__.py
│   ├── config.py                   # Parkings, constantes, palette du graphique
│   ├── scraper.py                  # Scraping et parsing des pages Semepa
│   └── storage.py                  # Historique CSV sur S3 (ou dossier local en dev)
├── scripts/
│   └── scrape_to_s3.py             # Job planifié : scrape + archive un relevé
├── .github/workflows/
│   └── scrape-parkings.yml         # Cron GitHub Actions (toutes les 10 min)
├── tests/
│   ├── test_scraper.py             # Tests unitaires (parsing, statuts)
│   └── test_storage.py             # Tests unitaires (historique CSV)
├── notebooks/
│   └── parking.ipynb               # Notebook d'exploration
├── .streamlit/
│   └── config.toml                 # Thème du dashboard (identique partout)
├── Dockerfile                      # Image Docker pour le déploiement
├── .dockerignore                   # Fichiers exclus de l'image
├── requirements.txt                # Dépendances de production
├── requirements-dev.txt            # Dépendances de développement (pytest)
└── README.md                       # Documentation
```

## 🗄️ Historique S3 : mise en place

L'historique repose sur un bucket S3 alimenté toutes les 10 minutes par GitHub Actions. Coût estimé : **moins de 0,50 € par an** (~50 Mo et ~52 000 écritures par an).

### 1. Créer le bucket S3

Dans la console AWS (région conseillée : `eu-west-3` Paris) : crée un bucket privé, par exemple `dashboard-parking-aix`. Aucune configuration particulière (pas d'accès public).

### 2. Créer un utilisateur IAM dédié

Crée un utilisateur IAM (ex: `dashboard-parking-bot`) **sans accès console**, avec une clé d'accès et cette politique minimale (remplace le nom du bucket) :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::dashboard-parking-aix/history/*"
    }
  ]
}
```

### 3. Configurer les secrets GitHub

Dans le repo GitHub : *Settings → Secrets and variables → Actions → New repository secret* :

| Secret | Valeur |
|---|---|
| `S3_BUCKET` | nom du bucket (ex: `dashboard-parking-aix`) |
| `AWS_ACCESS_KEY_ID` | clé de l'utilisateur IAM |
| `AWS_SECRET_ACCESS_KEY` | clé secrète de l'utilisateur IAM |
| `AWS_DEFAULT_REGION` | région du bucket (ex: `eu-west-3`) |

Le workflow `scrape-parkings.yml` démarre alors automatiquement (onglet *Actions* pour vérifier ; il peut aussi être lancé à la main via *Run workflow*). Note : les crons GitHub peuvent dériver de quelques minutes aux heures de pointe.

### 4. Donner l'accès en lecture au dashboard

Le dashboard lit l'historique avec les mêmes variables d'environnement. Selon l'hébergement :
- **Hugging Face Space** : *Settings → Variables and secrets* → ajouter les 4 mêmes variables
- **Docker / VPS** : passer les variables au conteneur :

```bash
docker run -d -p 8501:8501 --restart unless-stopped \
  -e S3_BUCKET=dashboard-parking-aix \
  -e AWS_ACCESS_KEY_ID=... \
  -e AWS_SECRET_ACCESS_KEY=... \
  -e AWS_DEFAULT_REGION=eu-west-3 \
  --name dashboard-parking dashboard-parking
```

Sans ces variables, le dashboard fonctionne normalement mais affiche « Aucun historique disponible » à la place du graphique.

### Développement local sans AWS

Le job peut écrire dans un dossier local `history/` (ignoré par git) au lieu de S3 :

```bash
python -m scripts.scrape_to_s3 --local
```

Le dashboard lira automatiquement ce dossier si `S3_BUCKET` n'est pas défini — pratique pour tester le graphique sans bucket.

## 🧪 Tests

```bash
pip install -r requirements-dev.txt
python -m pytest
```

Les tests couvrent le parsing HTML (nombre de places, « COMPLET », fermeture, page sans données) et la construction des statuts, sans dépendre du réseau.

## 🔧 Configuration

Toute la configuration est centralisée dans `parking_dashboard/config.py` :

### Modifier l'intervalle de rafraîchissement

```python
# Actuellement 600 secondes (10 minutes)
CACHE_TTL_SECONDES = 600
```

### Ajouter/retirer des parkings

Modifie la liste `PARKINGS` :
```python
PARKINGS = [
    Parking("Nom", "URL_BASE", PAGE_ID, CAPACITE, LATITUDE, LONGITUDE),
    # ...
]
```

## 📡 Scraping expliqué

Le scraping utilise une **expression régulière (regex)** pour extraire le nombre de places :

```regex
<p class="nbPlaces"><span[^>]*>(\d+)</span>
```

**Exemple HTML :**
```html
<p class="nbPlaces">
  <span style="font-size:30px;color:#ae0a15;">205</span> 
  places libres
</p>
```

**Extraction :** `205`

## 🐛 Dépannage

### "Module not found"
```bash
pip install -r requirements.txt
```

### Les données semblent figées
Le cache a une durée de vie de 10 minutes. Clique sur « 🔄 Rafraîchir maintenant » pour forcer une mise à jour immédiate.

## 📈 Améliorations futures possibles

- [x] Historique des données (graphiques temporels)
- [ ] Notifications (SMS/Email) quand un parking se remplit
- [ ] Prédictions de disponibilité (ML)
- [ ] API REST pour utilisation tierce
- [ ] Support multi-villes
- [ ] CI GitHub Actions (lint + tests)

## 📝 Notes importantes

- **Scraping légal :** Ce projet scrape des sites publics sans identification, avec une pause entre chaque requête et un cache de 10 minutes pour limiter la charge. Respecte les conditions d'utilisation des sites.
- **Uptime Streamlit Cloud :** Gratuit mais avec limitations (app dormante après inactivité, redémarrage automatique à la première visite).

## 🔐 Données récupérées

Aucune donnée personnelle n'est collectée ni stockée. Seules les données publiques des parkings sont utilisées.

## 📄 Licence

Ce projet est open source. Libre d'utilisation et de modification.

## 👨‍💻 Auteur

Créé en décembre 2025 par Julien CHR

## 🤝 Support

Des questions ? Crée une issue sur GitHub ou contacte directement.

---

**Dernière mise à jour :** Juillet 2026
