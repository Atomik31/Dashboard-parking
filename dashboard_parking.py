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
import folium
from streamlit_folium import st_folium

st.set_page_config(
    page_title="Parkings Aix-en-Provence",
    page_icon="🅿️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# CSS pour responsive : centered sur desktop, full-width sur mobile
st.markdown("""
    <style>
        .main .block-container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        @media (max-width: 768px) {
            .main .block-container {
                max-width: 100%;
                padding-left: 1rem;
                padding-right: 1rem;
            }
        }
    </style>
""", unsafe_allow_html=True)

st.title("🅿️ Parkings Aix-en-Provence")
st.subheader("Places disponibles en temps réel")

parkings = {
    'Bellegarde': ('https://mamp.parkings-semepa.fr/', 213, 340, 43.5322096, 5.4502100),
    'Cardeurs': ('https://mamp.parkings-semepa.fr/', 219, 125, 43.5298981, 5.4458118),
    'Carnot': ('https://mamp.parkings-semepa.fr/', 211, 675, 43.5255598, 5.4554612),
    'Méjanes': ('https://mamp.parkings-semepa.fr/', 150, 800, 43.5239974, 5.4413805),
    'Mignet': ('https://mamp.parkings-semepa.fr/', 209, 800, 43.52425, 5.4476974),
    'Pasteur': ('https://mamp.parkings-semepa.fr/', 215, 650, 43.5339951, 5.4462335),
    'Rambot': ('https://parkings-semepa.fr/', 221, 400, 43.5304833, 5.4580851),
    'Rotonde': ('https://parkings-semepa.fr/', 206, 1800, 43.5253922, 5.4440594),
    'Signoret': ('https://mamp.parkings-semepa.fr/', 217, 350, 43.5333509, 5.4486254)
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

CACHE_FILE = 'parkings_cache.json'
TIMESTAMP_FILE = 'last_update.txt'

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
    # Sauvegarder aussi le timestamp dans un fichier séparé
    with open(TIMESTAMP_FILE, 'w') as f:
        f.write(datetime.now(ZoneInfo("Europe/Paris")).strftime("%H:%M:%S"))

import hashlib

def get_timestamp_hash():
    """Récupère le hash du fichier timestamp pour détecter les changements"""
    if os.path.exists(TIMESTAMP_FILE):
        try:
            with open(TIMESTAMP_FILE, 'r') as f:
                content = f.read().strip()
            return hashlib.md5(content.encode()).hexdigest()
        except:
            return "error"
    return "notfound"

def load_timestamp():
    """Charge le timestamp de la dernière mise à jour"""
    if os.path.exists(TIMESTAMP_FILE):
        try:
            with open(TIMESTAMP_FILE, 'r') as f:
                return f.read().strip()
        except:
            return "N/A"
    return "N/A"

def scraper_parkings():
    """Scrape tous les parkings"""
    data = {}
    
    for nom, (base_url, page_id, capacite, lat, lon) in parkings.items():
        try:
            response = requests.get(base_url, params={"page_id": page_id}, headers=headers, timeout=5)
            
            match_nombre = re.search(r'<p class="nbPlaces"><span[^>]*>(\d+)</span>', response.text)
            match_texte = re.search(r'<p class="nbPlaces"><span[^>]*>([^<]+)</span>', response.text)
            
            if match_nombre:
                places_libres = int(match_nombre.group(1))
                affichage = "COMPLET" if places_libres <= 2 else f"{places_libres} / {capacite}"
                data[nom] = {
                    'Places': places_libres,
                    'Capacite': capacite,
                    'Affichage': affichage,
                    'Statut': '✅ Ouvert',
                    'Timestamp': datetime.now(ZoneInfo("Europe/Paris")).strftime("%H:%M:%S"),
                    'latitude': lat,
                    'longitude': lon
                }
            elif match_texte:
                statut = match_texte.group(1).strip()
                
                # Si le texte est "COMPLET", on le traite comme un parking ouvert
                if statut.upper() == "COMPLET":
                    data[nom] = {
                        'Places': 0,
                        'Capacite': capacite,
                        'Affichage': 'COMPLET',
                        'Statut': '✅ Ouvert',
                        'Timestamp': datetime.now(ZoneInfo("Europe/Paris")).strftime("%H:%M:%S"),
                        'latitude': lat,
                        'longitude': lon
                    }
                else:
                    # Sinon c'est un vrai message d'erreur/fermeture
                    data[nom] = {
                        'Places': 0,
                        'Capacite': capacite,
                        'Affichage': statut,
                        'Statut': f'⚠️ {statut}',
                        'Timestamp': datetime.now(ZoneInfo("Europe/Paris")).strftime("%H:%M:%S"),
                        'latitude': lat,
                        'longitude': lon
                    }
            else:
                data[nom] = {
                    'Places': 0,
                    'Capacite': capacite,
                    'Affichage': 'N/A',
                    'Statut': '❓ Pas de données',
                    'Timestamp': datetime.now(ZoneInfo("Europe/Paris")).strftime("%H:%M:%S"),
                    'latitude': lat,
                    'longitude': lon
                }
            
        except Exception as e:
            data[nom] = {
                'Places': 0,
                'Capacite': capacite,
                'Affichage': 'Erreur',
                'Statut': f'❌ Erreur',
                'Timestamp': datetime.now(ZoneInfo("Europe/Paris")).strftime("%H:%M:%S"),
                'latitude': lat,
                'longitude': lon
            }
        
        time.sleep(0.5)
    
    return data

def scraper_background():
    """Fonction qui scrape en arrière-plan toutes les 2 mins"""
    print("⏳ Scraper en attente de 2 minutes avant le premier scrape...")
    time.sleep(120)
    print("✅ Début du scraping!")
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
        
        print("⏳ Scraper en attente de 10 minutes avant le prochain scrape...")
        time.sleep(600)
        print("✅ Scrape suivant!")

# Lancer le thread de scraping une seule fois par processus
if 'SCRAPER_STARTED' not in os.environ:
    os.environ['SCRAPER_STARTED'] = '1'
    scraper_thread = threading.Thread(target=scraper_background, daemon=True)
    scraper_thread.start()
    print("🚀 Thread de scraping lancé en background")

cached_data = load_cache()

if not cached_data:
    st.info("🔄 Première initialisation... Chargement des données...")
    with st.spinner("Récupération des données en cours..."):
        cached_data = scraper_parkings()
        save_cache(cached_data)
    st.success("✅ Chargement des données terminé!")

# Lire directement le contenu du fichier timestamp
if os.path.exists(TIMESTAMP_FILE):
    with open(TIMESTAMP_FILE, 'r') as f:
        last_update_display = f.read().strip()
else:
    last_update_display = "N/A"

col1, col2, col3 = st.columns([1, 1, 1])
with col2:
    if st.button("🔄 Rafraîchir maintenant", use_container_width=True):
        with st.spinner("Récupération des données..."):
            cached_data = scraper_parkings()
            save_cache(cached_data)
        st.success("✅ Données mises à jour!")
        st.rerun()

df = pd.DataFrame(cached_data).T
df = df.sort_values('Places', ascending=False)

col1, col2, col3 = st.columns(3)

with col1:
    total_places = df['Places'].sum()
    st.metric("Total places", total_places, delta="places disponibles")

with col2:
    open_count = len(df[df['Statut'] == '✅ Ouvert'])
    st.metric("Parkings ouverts", f"{open_count}/9")

with col3:
    st.metric("Dernière mise à jour", last_update_display)

st.divider()

cols = st.columns(3)

for idx, (nom, row) in enumerate(df.iterrows()):
    col = cols[idx % 3]
    
    with col:
        if row['Statut'] == '✅ Ouvert':
            container = st.container(border=True)
            container.metric(nom, row['Affichage'], delta=row['Statut'])
            container.caption(f"🕐 {row['Timestamp']}")
        else:
            container = st.container(border=True)
            container.warning(f"**{nom}**\n\n{row['Affichage']}")
            container.caption(f"🕐 {row['Timestamp']}")

st.divider()

# ===== MAP INTERACTIVE GOOGLE MAPS =====
st.subheader("🗺️ Localisation des parkings")

# Créer la map Folium avec tuiles Google Maps
m = folium.Map(
    location=[43.52829276, 5.4525416],
    zoom_start=15,
    tiles="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    attr="Google"
)

# Fonction pour obtenir la couleur selon le statut
def get_color(statut, places, capacite):
    """Retourne la couleur selon le statut et le taux de remplissage"""
    # Si pas ouvert, retourner gris
    if statut != '✅ Ouvert':
        return 'gray'
    
    # Si ouvert, calculer le taux
    taux = places / capacite
    if taux > 0.5:
        return 'green'  # Vert - beaucoup de places
    elif taux > 0.1:
        return 'orange'  # Orange - places limitées
    else:
        return 'red'  # Rouge - presque plein

# Ajouter les marqueurs pour chaque parking
for nom, row in df.iterrows():
    color = get_color(row['Statut'], int(row['Places']), int(row['Capacite']))
    
    popup_text = f"""
    <b>{nom}</b><br/>
    Places: {row['Affichage']}<br/>
    Statut: {row['Statut']}<br/>
    MAJ: {row['Timestamp']}
    """
    
    folium.CircleMarker(
        location=[row['latitude'], row['longitude']],
        radius=15,
        popup=folium.Popup(popup_text, max_width=250),
        tooltip=f"{nom}: {row['Affichage']}",
        color=color,
        fill=True,
        fillColor=color,
        fillOpacity=0.7,
        weight=2
    ).add_to(m)

# Afficher la map en full-width
st_folium(m, height=600, width=int(st.session_state.get('width', 800)))
    
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.markdown("🟢 **Plus de 50%** - Beaucoup de places")
with col2:
    st.markdown("🟠 **10-50%** - Places limitées")
with col3:
    st.markdown("🔴 **Moins de 10%** - Presque plein")
with col4:
    st.markdown("⚫ **Parking Hors Service**")

st.divider()

st.subheader("📊 Tableau détaillé")
st.dataframe(df, use_container_width=True)

st.caption("✒️ Dashboard conçu par Julien CHR")
