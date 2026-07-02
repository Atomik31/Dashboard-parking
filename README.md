# Dashboard-parking
# 🅿️ Dashboard Parkings Aix-en-Provence

Un dashboard web en temps réel pour consulter la disponibilité des places de parking à Aix-en-Provence.

## 📸 Aperçu

Le dashboard affiche:
- **9 parkings** gérés par Semepa (Bellegarde, Cardeurs, Carnot, Méjanes, Mignet, Pasteur, Rambot, Rotonde, Signoret)
- **Places disponibles** actualisées automatiquement
- **Total des places** disponibles en temps réel
- **Statut** de chaque parking (Ouvert, Fermeture temporaire, etc.)
- **Dernière mise à jour** de chaque parking

## 🚀 Déploiement

Le dashboard est déployé sur **Streamlit Cloud** et accessible gratuitement:

```
https://dashboard-parking.streamlit.app/
```

## 📦 Installation locale

### Étapes

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
python -m streamlit run dashboard_parking_background.py
```

4. **Accéder au dashboard**
```
http://localhost:8501
```

## 🛠️ Comment ça marche

### 3 étapes simples

**1. 🕷️ Scraping**
- Récupère les pages HTML des sites Semepa
- Envoie une requête toutes les 30 minutes
- Extraction automatique en arrière-plan

**2. 📦 Récupération des données**
- Parse le HTML avec des expressions régulières (regex)
- Extrait le nombre de places disponibles
- Récupère le statut de chaque parking (Ouvert, Fermé, etc.)

**3. 📊 Mise en forme et exposition**
- Sauvegarde dans un cache JSON local
- Affiche les données dans un dashboard Streamlit
- Mise à jour instantanée au rafraîchissement

```
Sites Semepa → Scraping HTML → Extraction Regex → Cache JSON → Dashboard Web
```

### Technologies utilisées

- **Requests** - Récupération des pages web
- **Regex** - Extraction des données
- **Pandas** - Mise en forme des données
- **Streamlit** - Exposition du dashboard
- **Threading** - Scraping en arrière-plan


## 📊 Fichiers du projet

```
Dashboard-parking/
├── dashboard_parking.py            # Fichier principal (Streamlit)
├── requirements.txt                # Dépendances Python
├── parkings_cache.json             # Cache des données (généré)
└── README.md                       # Documentation
```

## 🔧 Configuration

### Modifier l'intervalle de scraping

Ouvre `dashboard_parking_background.py` et change cette ligne:
```python
# Actuellement 1800 secondes (30 minutes)
time.sleep(1800)  # Change 1800 par le nombre de secondes souhaité
```

**Exemples:**
- 5 minutes: `time.sleep(300)`
- 10 minutes: `time.sleep(600)`
- 1 heure: `time.sleep(3600)`

### Ajouter/retirer des parkings

Modifie le dictionnaire `parkings`:
```python
parkings = {
    'Nom_Parking': ('URL_BASE', PAGE_ID),
    # ...
}
```

## 📡 Scraping expliqué

Le scraping utilise une **expression régulière (regex)** pour extraire le nombre de places:

```regex
<p class="nbPlaces"><span[^>]*>(\d+)</span>
```

**Exemple HTML:**
```html
<p class="nbPlaces">
  <span style="font-size:30px;color:#ae0a15;">205</span> 
  places libres
</p>
```

**Extraction:** `205`

## 🐛 Dépannage

### "Module not found"
```bash
pip install -r requirements.txt
```

### Le cache ne se met pas à jour
Supprime `parkings_cache.json` et relance:
```bash
rm parkings_cache.json
python -m streamlit run dashboard_parking_background.py
```

### Les données sont erronées
Clique sur "🔄 Rafraîchir maintenant" pour forcer une mise à jour immédiate.

## 📈 Améliorations futures possibles

- [ ] Historique des données (graphiques temporels)
- [ ] Notifications (SMS/Email) quand un parking se remplit
- [ ] Intégration avec Google Maps
- [ ] Prédictions de disponibilité (ML)
- [ ] API REST pour utilisation tierce
- [ ] Mode sombre
- [ ] Support multi-villes

## 📝 Notes importantes

- **Scraping légal:** Ce projet scrape des sites publics sans identification. Respecte les conditions d'utilisation des sites.
- **Performance:** Le thread en background utilise ~5MB de RAM et consomme peu de bande passante.
- **Uptime Streamlit Cloud:** Gratuit mais avec limitations (1 app dormante = redémarrage auto après 1h d'inactivité).

## 🔐 Données récupérées

Aucune donnée personnelle n'est collectée ni stockée. Seules les données publiques des parkings sont utilisées.

## 📄 Licence

Ce projet est open source. Libre d'utilisation et de modification.

## 👨‍💻 Auteur

Créé en décembre 2025 par Julien CHR

## 🤝 Support

Des questions? Crée une issue sur GitHub ou contacte directement.

---

**Dernière mise à jour:** Décembre 2025