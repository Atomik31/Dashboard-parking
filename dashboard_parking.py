import streamlit as st
import requests
import re
import time
import pandas as pd
from datetime import datetime

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

@st.cache_data(ttl=30)
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
                    'Timestamp': datetime.now().strftime("%H:%M:%S")
                }
            elif match_texte:
                statut = match_texte.group(1)
                data[nom] = {
                    'Places': 0,
                    'Statut': f'⚠️ {statut}',
                    'Timestamp': datetime.now().strftime("%H:%M:%S")
                }
            else:
                data[nom] = {
                    'Places': 0,
                    'Statut': '❓ Pas de données',
                    'Timestamp': datetime.now().strftime("%H:%M:%S")
                }
            
        except Exception as e:
            data[nom] = {
                'Places': 0,
                'Statut': f'❌ Erreur',
                'Timestamp': datetime.now().strftime("%H:%M:%S")
            }
        
        time.sleep(0.5)
    
    return data

# Bouton pour rafraîchir
col1, col2, col3 = st.columns([1, 1, 1])
with col2:
    if st.button("🔄 Rafraîchir", use_container_width=True):
        st.cache_data.clear()

# Récupérer les données
data = scraper_parkings()

# Convertir en DataFrame et trier
df = pd.DataFrame(data).T
df = df.sort_values('Places', ascending=False)

# Afficher les stats globales
col1, col2, col3 = st.columns(3)

with col1:
    total_places = df['Places'].sum()
    st.metric("Total places", total_places, delta="places disponibles")

with col2:
    open_count = len(df[df['Statut'] == '✅ Ouvert'])
    st.metric("Parkings ouverts", f"{open_count}/9")

with col3:
    st.metric("Mise à jour", "Toutes les 30s", delta="auto-refresh")

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

# Auto-refresh
st.markdown("""
<script>
    setTimeout(function() {
        window.location.reload();
    }, 30000);
</script>
""", unsafe_allow_html=True)