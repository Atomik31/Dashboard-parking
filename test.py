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
    
    for nom, (base_url, page_id, capacite, lat, lon) in parkings.items():
        try:
            response = requests.get(base_url, params={"page_id": page_id}, headers=headers, timeout=5)
            
            match_nombre = re.search(r'<p class="nbPlaces"><span[^>]*>(\d+)</span>', response.text)
            match_texte = re.search(r'<p class="nbPlaces"><span[^>]*>([^<]+)</span>', response.text)
            
            if match_nombre:
                places_libres = int(match_nombre.group(1))
                data[nom] = {
                    'Places': places_libres,
                    'Capacite': capacite,
                    'Affichage': f"{places_libres} / {capacite}",
                    'Statut': '✅ Ouvert',
                    'Timestamp': datetime.now(ZoneInfo("Europe/Paris")).strftime("%H:%M:%S"),
                    'latitude': lat,
                    'longitude': lon
                }
            elif match_texte:
                statut = match_texte.group(1)
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
    """Fonction qui scrape en arrière-plan toutes les 10 mins"""
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
        
        time.sleep(600)

if 'scraper_started' not in st.session_state:
    scraper_thread = threading.Thread(target=scraper_background, daemon=True)
    scraper_thread.start()
    st.session_state.scraper_started = True
    print("🚀 Thread de scraping lancé en background")

cached_data = load_cache()

if not cached_data:
    st.info("🔄 Première initialisation... Chargement des données...")
    with st.spinner("Récupération des données en cours..."):
        cached_data = scraper_parkings()
        save_cache(cached_data)
    st.success("✅ Chargement des données terminé!")

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
    last_update = df['Timestamp'].iloc[0] if len(df) > 0 else "N/A"
    st.metric("Dernière mise à jour", last_update)
    st.caption(f"🕐 {datetime.now(ZoneInfo('Europe/Paris')).strftime('%d/%m/%Y')}")

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

# ===== MAP FOLIUM =====
st.subheader("🗺️ Localisation des parkings")

# Fonction pour obtenir la couleur
def get_color(places, capacite):
    """Retourne la couleur selon le taux de remplissage"""
    if capacite == 0:
        return 'gray'
    taux = places / capacite
    if taux > 0.5:
        return 'green'
    elif taux > 0.2:
        return 'orange'
    else:
        return 'red'

# Créer la map avec Folium - style Google Maps
m = folium.Map(
    location=[43.52829276, 5.4525416],
    zoom_start=15,
    tiles="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    attr="Google"
)

# Ajouter les marqueurs
for nom, row in df.iterrows():
    color = get_color(int(row['Places']), int(row['Capacite']))
    taux = round((int(row['Places']) / int(row['Capacite'])) * 100)
    
    popup_text = f"""
    <b>{nom}</b><br/>
    Places: {int(row['Places'])}/{int(row['Capacite'])}<br/>
    Taux: {taux}%<br/>
    MAJ: {row['Timestamp']}
    """
    
    folium.CircleMarker(
        location=[row['latitude'], row['longitude']],
        radius=14,
        popup=folium.Popup(popup_text, max_width=250),
        tooltip=f"{nom}: {int(row['Places'])}/{int(row['Capacite'])}",
        color=color,
        fill=True,
        fillColor=color,
        fillOpacity=0.7,
        weight=2
    ).add_to(m)

# Afficher la map
st_folium(m, width=1600, height=600)

col1, col2, col3 = st.columns(3)
with col1:
    st.markdown("🟢 **Plus de 50%** - Beaucoup de places")
with col2:
    st.markdown("🟠 **20-50%** - Places limitées")
with col3:
    st.markdown("🔴 **Moins de 20%** - Presque plein")

st.divider()

st.subheader("📊 Tableau détaillé")
st.dataframe(df, use_container_width=True)

st.caption("✒️ Dashboard conçu par Julien CHR")