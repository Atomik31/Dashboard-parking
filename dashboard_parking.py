import streamlit as st
import requests
import re
import pandas as pd
from datetime import datetime
import threading
import time
import json
import os
from zoneinfo import ZoneInfo

st.set_page_config(
    page_title="Parkings Aix-en-Provence",
    page_icon="🅿️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

st.title("🅿️ Parkings Aix-en-Provence")
st.subheader("Places disponibles en temps réel")

parkings = {
    'Bellegarde': ('https://mamp.parkings-semepa.fr/', 213),
    'Cardeurs': ('https://mamp.parkings-semepa.fr/', 219),
    'Carnot': ('https://mamp.parkings-semepa.fr/', 211),
    'Méjanes': ('https://mamp.parkings-semepa.fr/', 150),
    'Mignet': ('https://mamp.parkings-semepa.fr/', 209),
    'Pasteur': ('https://mamp.parkings-semepa.fr/', 215),
    'Rambot': ('https://parkings-semepa.fr/', 221),
    'Rotonde': ('https://parkings-semepa.fr/', 206),
    'Signoret': ('https://mamp.parkings-semepa.fr/', 217)
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

# Fichier de cache pour les données
CACHE_FILE = 'parkings_cache.json'
LOCK_FILE = 'scraping.lock'

def load_cache():
    """Charge les données du cache"""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_cache(data):
    """Sauvegarde les données dans le cache"""
    with open(CACHE_FILE, 'w') as f:
        json.dump(data, f)

def scraper_parkings():
    """Scrape tous les parkings"""
    data = {}
    
    for nom, (base_url, page_id) in parkings.items():
        try:
            response = requests.get(base_url, params={"page_id": page_id}, headers=headers, timeout=5)
            
            match_nombre = re.search(r'<p class="nbPlaces"><span[^>]*>(\d+)</span>', response.text)
            match_texte = re.search(r'<p class="nbPlaces"><span[^>]*>([^<]+)</span>', response.text)
            
            if match_nombre:
                places_libres = int(match_nombre.group(1))
                data[nom] = {
                    'Places': places_libres,
                    'Statut': '✅ Ouvert',
                    'Timestamp': datetime.now(ZoneInfo("Europe/Paris")).strftime("%H:%M:%S")
                }
            elif match_texte:
                statut = match_texte.group(1)
                data[nom] = {
                    'Places': 0,
                    'Statut': f'⚠️ {statut}',
                    'Timestamp': datetime.now(ZoneInfo("Europe/Paris")).strftime("%H:%M:%S")
                }
            else:
                data[nom] = {
                    'Places': 0,
                    'Statut': '❓ Pas de données',
                    'Timestamp': datetime.now(ZoneInfo("Europe/Paris")).strftime("%H:%M:%S")
                }
            
        except Exception as e:
            data[nom] = {
                'Places': 0,
                'Statut': f'❌ Erreur',
                'Timestamp': datetime.now(ZoneInfo("Europe/Paris")).strftime("%H:%M:%S")
            }
        
        time.sleep(0.5)
    
    return data

def scraper_background():
    """Fonction qui scrape en arrière-plan toutes les 30 mins"""
    while True:
        try:
            now = datetime.now(ZoneInfo("Europe/Paris")).strftime("%d/%m/%Y %H:%M:%S")
            print(f"[{now}] Scraping en arrière-plan...")
            data = scraper_parkings()
            save_cache(data)
            now = datetime.now(ZoneInfo("Europe/Paris")).strftime("%d/%m/%Y %H:%M:%S")
            print(f"[{now}] Scraping terminé et cache mis à jour")
        except Exception as e:
            print(f"Erreur lors du scraping: {e}")
        
        # Attendre 10 minutes (600 secondes)
        time.sleep(600)

# Initialiser le thread de scraping en background au démarrage
if 'scraper_started' not in st.session_state:
    scraper_thread = threading.Thread(target=scraper_background, daemon=True)
    scraper_thread.start()
    st.session_state.scraper_started = True
    print("🚀 Thread de scraping lancé en background")

# Charger les données du cache
cached_data = load_cache()

if not cached_data:
    st.info("🔄 Première initialisation... chargement des données...")
    with st.spinner("Récupération des données en cours..."):
        cached_data = scraper_parkings()
        save_cache(cached_data)
    st.success("✅ Chargement des données terminé!")

# Afficher bouton pour forcer la mise à jour
col1, col2, col3 = st.columns([1, 1, 1])
with col2:
    if st.button("🔄 Rafraîchir maintenant", use_container_width=True):
        with st.spinner("Récupération des données..."):
            cached_data = scraper_parkings()
            save_cache(cached_data)
        st.success("✅ Données mises à jour!")
        st.rerun()

# Convertir en DataFrame et trier
df = pd.DataFrame(cached_data).T
df = df.sort_values('Places', ascending=False)

# Récupérer le dernier timestamp (tous les parkings ont le même)
last_update = df['Timestamp'].iloc[0] if len(df) > 0 else "N/A"

# Afficher les stats globales
col1, col2, col3 = st.columns(3)

with col1:
    total_places = df['Places'].sum()
    st.metric("Total places", total_places, delta="places disponibles")

with col2:
    open_count = len(df[df['Statut'] == '✅ Ouvert'])
    st.metric("Parkings ouverts", f"{open_count}/9")

with col3:
    st.metric("Dernière mise à jour", last_update)
    st.caption(f"🕐 {datetime.now(ZoneInfo('Europe/Paris')).strftime('%d/%m/%Y')}")

st.divider()

# Afficher les cards
cols = st.columns(3)

for idx, (nom, row) in enumerate(df.iterrows()):
    col = cols[idx % 3]
    
    with col:
        if row['Statut'] == '✅ Ouvert':
            container = st.container(border=True)
            container.metric(nom, f"{int(row['Places'])} places", delta=row['Statut'])
            container.caption(f"🕐 {row['Timestamp']}")
        else:
            container = st.container(border=True)
            container.warning(f"**{nom}**\n\n{row['Statut']}")
            container.caption(f"🕐 {row['Timestamp']}")

st.divider()

# Tableau détaillé
st.subheader("📊 Tableau détaillé")
st.dataframe(df, use_container_width=True)

st.caption("⏱️ Scraping automatique en arrière-plan toutes les 10 minutes")