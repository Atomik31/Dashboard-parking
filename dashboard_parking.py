"""Dashboard Streamlit : places disponibles des parkings publics d'Aix-en-Provence."""
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

import folium
import pandas as pd
import plotly.express as px
import streamlit as st
from streamlit_folium import st_folium

from parking_dashboard.config import (
    CACHE_TTL_SECONDES,
    CENTRE_CARTE,
    COULEURS_SERIES,
    PARKINGS,
    PLAGES_HISTORIQUE,
    TIMEZONE,
)
from parking_dashboard.scraper import STATUT_OUVERT, scrape_all
from parking_dashboard.storage import charger_historique

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

st.set_page_config(
    page_title="Parkings Aix-en-Provence",
    page_icon="🅿️",
    layout="centered",
    initial_sidebar_state="collapsed",
)

st.title("🅿️ Parkings Aix-en-Provence")
st.subheader("Places disponibles en temps réel")


@st.cache_data(ttl=CACHE_TTL_SECONDES, show_spinner="Récupération des données des parkings...")
def charger_donnees() -> tuple[dict[str, dict], str]:
    """Scrape les parkings; le résultat est partagé entre toutes les sessions pendant le TTL."""
    data = scrape_all()
    horodatage = datetime.now(ZoneInfo(TIMEZONE)).strftime("%H:%M:%S")
    return data, horodatage


donnees, derniere_maj = charger_donnees()

col1, col2, col3 = st.columns([1, 1, 1])
with col2:
    if st.button("🔄 Rafraîchir maintenant", use_container_width=True):
        charger_donnees.clear()
        st.rerun()

df = pd.DataFrame(donnees).T
df = df.sort_values("Places", ascending=False)

col1, col2, col3 = st.columns(3)

with col1:
    st.metric("Total places disponibles", int(df["Places"].sum()))

with col2:
    ouverts = int((df["Statut"] == STATUT_OUVERT).sum())
    st.metric("Parkings ouverts", f"{ouverts}/{len(PARKINGS)}")

with col3:
    st.metric("Dernière mise à jour", derniere_maj)

st.divider()

cols = st.columns(3)

for idx, (nom, row) in enumerate(df.iterrows()):
    with cols[idx % 3]:
        container = st.container(border=True)
        if row["Statut"] == STATUT_OUVERT:
            container.metric(nom, row["Affichage"], delta=row["Statut"])
        else:
            container.warning(f"**{nom}**\n\n{row['Affichage']}")
        container.caption(f"🕐 {row['Timestamp']}")

st.divider()

st.subheader("🗺️ Localisation des parkings")


def couleur_marqueur(statut: str, places: int, capacite: int) -> str:
    """Couleur du marqueur selon le statut et le taux de places disponibles."""
    if statut != STATUT_OUVERT:
        return "gray"
    taux = places / capacite
    if taux > 0.5:
        return "green"
    if taux > 0.1:
        return "orange"
    return "red"


carte = folium.Map(
    location=list(CENTRE_CARTE),
    zoom_start=15,
    tiles="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    attr="Google",
)

for nom, row in df.iterrows():
    couleur = couleur_marqueur(row["Statut"], int(row["Places"]), int(row["Capacite"]))

    popup_html = f"""
    <b>{nom}</b><br/>
    Places: {row['Affichage']}<br/>
    Statut: {row['Statut']}<br/>
    MAJ: {row['Timestamp']}
    """

    folium.CircleMarker(
        location=[row["latitude"], row["longitude"]],
        radius=15,
        popup=folium.Popup(popup_html, max_width=250),
        tooltip=f"{nom}: {row['Affichage']}",
        color=couleur,
        fill=True,
        fillColor=couleur,
        fillOpacity=0.7,
        weight=2,
    ).add_to(carte)

st_folium(carte, height=600, width=700)

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

st.subheader("📈 Historique d'occupation")

COULEUR_PAR_PARKING = {p.nom: c for p, c in zip(PARKINGS, COULEURS_SERIES)}


@st.cache_data(ttl=CACHE_TTL_SECONDES, show_spinner="Chargement de l'historique...")
def charger_historique_cache(heures: int) -> pd.DataFrame:
    return charger_historique(heures)


col_plage, col_mesure = st.columns([1, 1])
with col_plage:
    plage = st.segmented_control(
        "Période", list(PLAGES_HISTORIQUE), default="6 h", key="plage_historique"
    )
with col_mesure:
    mesure = st.segmented_control(
        "Mesure", ["Places libres", "Occupation (%)"], default="Places libres", key="mesure_historique"
    )

noms_parkings = [p.nom for p in PARKINGS]
selection = st.multiselect("Parkings affichés", noms_parkings, default=noms_parkings)

historique = charger_historique_cache(PLAGES_HISTORIQUE.get(plage, 6))

if historique.empty:
    st.info(
        "Aucun historique disponible pour le moment. Il se construit automatiquement "
        "toutes les 10 minutes via le job planifié (voir le README, section Historique S3)."
    )
elif not selection:
    st.info("Sélectionne au moins un parking pour afficher l'historique.")
else:
    historique = historique[historique["parking"].isin(selection)].copy()
    historique["Heure"] = historique["timestamp_utc"].dt.tz_convert(TIMEZONE)

    if mesure == "Occupation (%)":
        historique["valeur"] = (
            (1 - historique["places_dispo"] / historique["places_total"]) * 100
        ).clip(0, 100).round(1)
    else:
        historique["valeur"] = historique["places_dispo"]

    fig = px.line(
        historique,
        x="Heure",
        y="valeur",
        color="parking",
        color_discrete_map=COULEUR_PAR_PARKING,
        category_orders={"parking": noms_parkings},
    )
    fig.update_traces(line_width=2)
    fig.update_layout(
        hovermode="x unified",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font_color="#898781",
        legend=dict(title=None, orientation="h", yanchor="bottom", y=1.02),
        margin=dict(l=10, r=10, t=10, b=10),
        xaxis=dict(gridcolor="#3d3d43", title=None),
        yaxis=dict(
            gridcolor="#3d3d43",
            title=mesure,
            range=[0, 100] if mesure == "Occupation (%)" else None,
            rangemode="tozero",
        ),
    )
    st.plotly_chart(fig, use_container_width=True)

st.caption("✒️ Dashboard conçu par Julien CHARLIER")
