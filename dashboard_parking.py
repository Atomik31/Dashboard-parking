"""Dashboard Streamlit : places disponibles des parkings publics d'Aix-en-Provence."""
import logging
from contextlib import contextmanager
from datetime import datetime
from zoneinfo import ZoneInfo

import folium
import pandas as pd
import plotly.express as px
import streamlit as st
from branca.element import MacroElement
from folium.elements import JSCSSMixin
from jinja2 import Template
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
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ---------------------------------------------------------------------------
# Design V2 : palette et composants (voir maquette_v2.html)
# ---------------------------------------------------------------------------

SURFACE = "#1F1F24"
ACCENT = "#3987e5"

# Couleurs d'état : disponibilité large / limitée / presque complet / indisponible
COULEURS_ETAT = {"good": "#0ca30c", "warn": "#fab219", "crit": "#e05252", "closed": "#898781"}
LIBELLES_ETAT = {"good": "Large", "warn": "Limité", "crit": "Presque complet"}

st.markdown(
    """
<style>
:root {
  --pk-surface: #1F1F24;
  --pk-ink: #ffffff;
  --pk-ink2: #c3c2b7;
  --pk-muted: #898781;
  --pk-border: rgba(255, 255, 255, 0.10);
  --pk-accent: #3987e5;
  --pk-track: #3d3d43;
}
.block-container { padding-top: 1.2rem; padding-bottom: 2rem; max-width: 1500px; }
header[data-testid="stHeader"] { background: transparent; }

/* En-tête */
.pk-header { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
.pk-logo {
  width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;
  background: var(--pk-accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; font-weight: 700;
}
.pk-title { font-size: 19px; font-weight: 650; color: var(--pk-ink); letter-spacing: -0.01em; }
.pk-subtitle { font-size: 12.5px; color: var(--pk-ink2); margin-top: 1px; }
.pk-live {
  display: inline-flex; align-items: center; gap: 8px; margin-left: auto;
  font-size: 12.5px; color: var(--pk-ink2);
  padding: 6px 13px; border: 1px solid var(--pk-border); border-radius: 999px;
  white-space: nowrap;
}
.pk-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #0ca30c;
  animation: pk-pulse 2.4s ease-in-out infinite;
}
@keyframes pk-pulse { 50% { opacity: 0.35; } }
@media (prefers-reduced-motion: reduce) { .pk-dot { animation: none; } }

/* Tuiles d'indicateurs */
.pk-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.pk-tile {
  background: var(--pk-surface); border: 1px solid var(--pk-border);
  border-radius: 12px; padding: 12px 14px;
}
.pk-label {
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.07em;
  text-transform: uppercase; color: var(--pk-muted);
  line-height: 1.25;
}
/* Les tuiles réservent deux lignes de libellé pour que les valeurs s'alignent */
.pk-tile .pk-label { min-height: 26px; }
.pk-value {
  font-size: 26px; font-weight: 700; margin-top: 4px;
  letter-spacing: -0.02em; color: var(--pk-ink);
}
.pk-sub { font-size: 11.5px; color: var(--pk-ink2); margin-top: 2px; }

/* Libellés de section */
.pk-section {
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.07em;
  text-transform: uppercase; color: var(--pk-muted); margin: 14px 2px 8px;
}

/* Cartes parking */
.pk-card {
  background: var(--pk-surface); border: 1px solid var(--pk-border);
  border-radius: 12px; padding: 12px 14px; margin-bottom: 8px;
  transition: border-color 0.15s;
}
.pk-card:hover { border-color: var(--pk-accent); }
.pk-card-top { display: flex; align-items: baseline; gap: 10px; }
.pk-name { font-size: 14.5px; font-weight: 650; color: var(--pk-ink); }
.pk-chip {
  margin-left: auto; font-size: 11px; font-weight: 600;
  padding: 3px 9px; border-radius: 999px; white-space: nowrap;
}
.pk-chip.good { background: rgba(12, 163, 12, 0.15); color: #2ebe2e; }
.pk-chip.warn { background: rgba(250, 178, 25, 0.15); color: #fab219; }
.pk-chip.crit { background: rgba(224, 82, 82, 0.16); color: #e57373; }
.pk-chip.closed { background: rgba(137, 135, 129, 0.18); color: var(--pk-ink2); }
.pk-places { display: flex; align-items: baseline; gap: 6px; margin-top: 6px; }
.pk-big { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; color: var(--pk-ink); }
.pk-cap { font-size: 12.5px; color: var(--pk-muted); }
.pk-bar {
  height: 7px; border-radius: 4px; background: var(--pk-track);
  margin-top: 8px; overflow: hidden;
}
.pk-bar i { display: block; height: 100%; border-radius: 4px; }
.pk-meta {
  display: flex; justify-content: space-between;
  font-size: 11.5px; color: var(--pk-muted); margin-top: 7px;
  font-variant-numeric: tabular-nums;
}

/* Carte folium : coins arrondis comme les autres blocs */
iframe[title="streamlit_folium.st_folium"] { border-radius: 12px; }

/* Écran de chargement : overlay centré avec barre de progression animée */
.pk-loader {
  position: fixed; inset: 0; z-index: 999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(14, 14, 17, 0.72);
  backdrop-filter: blur(3px);
}
.pk-loader-box {
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  width: min(340px, 80vw); text-align: center;
}
.pk-loader-box .pk-logo { width: 52px; height: 52px; font-size: 30px; border-radius: 13px; }
.pk-loader-msg { font-size: 14.5px; font-weight: 500; color: var(--pk-ink2); }
.pk-loader-bar {
  width: 100%; height: 6px; border-radius: 999px;
  background: var(--pk-track); overflow: hidden;
}
.pk-loader-bar i {
  display: block; height: 100%; width: 38%; border-radius: 999px;
  background: linear-gradient(90deg, var(--pk-accent), #6db3ff);
  animation: pk-slide 1.1s ease-in-out infinite;
}
@keyframes pk-slide {
  0% { transform: translateX(-110%); }
  100% { transform: translateX(290%); }
}
@media (prefers-reduced-motion: reduce) {
  .pk-loader-bar i { animation-duration: 2.4s; }
}
</style>
""",
    unsafe_allow_html=True,
)


class GestureHandling(JSCSSMixin, MacroElement):
    """Plugin leaflet-gesture-handling : zoom à la molette uniquement avec Ctrl,
    déplacement mobile à deux doigts — sinon le scroll de la page reste prioritaire.

    Déclaré via JSCSSMixin pour que streamlit-folium charge les dépendances
    dans son iframe (les scripts ajoutés au header y sont ignorés).
    """

    _template = Template(
        """
        {% macro script(this, kwargs) %}
        if (!{{ this._parent.get_name() }}.gestureHandling
            && window.leafletGestureHandling) {
            {{ this._parent.get_name() }}.addHandler(
                "gestureHandling", window.leafletGestureHandling.GestureHandling);
        }
        if ({{ this._parent.get_name() }}.gestureHandling) {
            {{ this._parent.get_name() }}.gestureHandling.enable();
        }
        {% endmacro %}
        """
    )

    default_js = [
        (
            "leaflet_gesture_handling",
            "https://unpkg.com/leaflet-gesture-handling@1.2.2/dist/leaflet-gesture-handling.min.js",
        )
    ]
    default_css = [
        (
            "leaflet_gesture_handling_css",
            "https://unpkg.com/leaflet-gesture-handling@1.2.2/dist/leaflet-gesture-handling.min.css",
        )
    ]


def etat_parking(statut: str, places: int, capacite: int) -> str:
    """Classe visuelle d'un parking selon son statut et son taux de places libres."""
    if statut != STATUT_OUVERT:
        return "closed"
    taux = places / capacite
    if taux > 0.5:
        return "good"
    if taux > 0.1:
        return "warn"
    return "crit"


def fmt_nombre(valeur: int) -> str:
    """Formate un entier avec un séparateur de milliers à la française."""
    return f"{valeur:,}".replace(",", " ")


@contextmanager
def ecran_chargement(message: str):
    """Affiche un overlay centré avec barre de progression pendant un chargement."""
    placeholder = st.empty()
    placeholder.markdown(
        '<div class="pk-loader"><div class="pk-loader-box">'
        '<div class="pk-logo">P</div>'
        f'<div class="pk-loader-msg">{message}</div>'
        '<div class="pk-loader-bar"><i></i></div>'
        "</div></div>",
        unsafe_allow_html=True,
    )
    try:
        yield
    finally:
        placeholder.empty()


@st.cache_data(ttl=CACHE_TTL_SECONDES, show_spinner=False)
def charger_donnees() -> tuple[dict[str, dict], str]:
    """Scrape les parkings; le résultat est partagé entre toutes les sessions pendant le TTL."""
    data = scrape_all()
    horodatage = datetime.now(ZoneInfo(TIMEZONE)).strftime("%H:%M:%S")
    return data, horodatage


with ecran_chargement("Récupération des données des parkings..."):
    donnees, derniere_maj = charger_donnees()

df = pd.DataFrame(donnees).T
df["_ouvert"] = df["Statut"] == STATUT_OUVERT
df = df.sort_values(["_ouvert", "Places"], ascending=[False, False])

# ---------------------------------------------------------------------------
# En-tête : logo, titre, badge de fraîcheur, bouton d'actualisation
# ---------------------------------------------------------------------------

col_titre, col_bouton = st.columns([5, 1], vertical_alignment="center")
with col_titre:
    st.markdown(
        '<div class="pk-header">'
        '<div class="pk-logo">P</div>'
        "<div>"
        '<div class="pk-title">Parkings Aix-en-Provence</div>'
        f'<div class="pk-subtitle">Places disponibles en temps réel</div>'
        "</div>"
        f'<div class="pk-live"><span class="pk-dot"></span>Mis à jour à {derniere_maj}</div>'
        "</div>",
        unsafe_allow_html=True,
    )
with col_bouton:
    if st.button("Actualiser", type="primary", use_container_width=True):
        charger_donnees.clear()
        st.rerun()

# ---------------------------------------------------------------------------
# Panneau latéral (tuiles + liste des parkings) et carte
# ---------------------------------------------------------------------------

col_liste, col_carte = st.columns([1, 3], gap="medium")

with col_liste:
    ouverts = df[df["_ouvert"]]
    total_libres = int(ouverts["Places"].sum())
    total_capacite = int(ouverts["Capacite"].sum())
    nb_ouverts = len(ouverts)
    occupation = f"{round((1 - total_libres / total_capacite) * 100)} %" if total_capacite else "–"

    st.markdown(
        '<div class="pk-tiles">'
        '<div class="pk-tile"><div class="pk-label">Places libres</div>'
        f'<div class="pk-value">{fmt_nombre(total_libres)}</div>'
        '<div class="pk-sub">tous parcs</div></div>'
        '<div class="pk-tile"><div class="pk-label">Ouverts</div>'
        f'<div class="pk-value">{nb_ouverts}/{len(PARKINGS)}</div>'
        '<div class="pk-sub">en service</div></div>'
        '<div class="pk-tile"><div class="pk-label">Occupation</div>'
        f'<div class="pk-value">{occupation}</div>'
        '<div class="pk-sub">moyenne</div></div>'
        "</div>",
        unsafe_allow_html=True,
    )

    st.markdown(
        '<div class="pk-section">Parkings, du plus disponible au plus rempli</div>',
        unsafe_allow_html=True,
    )

    cartes_html = []
    for nom, row in df.iterrows():
        places, capacite = int(row["Places"]), int(row["Capacite"])
        etat = etat_parking(row["Statut"], places, capacite)

        if etat == "closed":
            chip = row["Affichage"]
            corps = f'<div class="pk-places"><span class="pk-cap">{row["Affichage"]}</span></div>'
            pct_libres = ""
        else:
            pct = round(places / capacite * 100)
            chip = "Complet" if row["Affichage"] == "COMPLET" else LIBELLES_ETAT[etat]
            corps = (
                f'<div class="pk-places"><span class="pk-big">{places}</span>'
                f'<span class="pk-cap">/ {fmt_nombre(capacite)} places</span></div>'
                f'<div class="pk-bar"><i style="width:{max(3, pct)}%;'
                f'background:{COULEURS_ETAT[etat]}"></i></div>'
            )
            pct_libres = f"{pct} % libres"

        cartes_html.append(
            '<div class="pk-card">'
            f'<div class="pk-card-top"><span class="pk-name">{nom}</span>'
            f'<span class="pk-chip {etat}">{chip}</span></div>'
            f"{corps}"
            f'<div class="pk-meta"><span>MAJ {row["Timestamp"]}</span><span>{pct_libres}</span></div>'
            "</div>"
        )
    st.markdown("".join(cartes_html), unsafe_allow_html=True)

with col_carte:
    # Hauteur alignée sur la colonne de gauche : tuiles + libellé de section
    # puis une carte par parking (les cartes "fermé" sont plus courtes).
    nb_fermes = int((~df["_ouvert"]).sum())
    nb_ouverts_cartes = len(df) - nb_fermes
    hauteur_carte = 125 + 144 * nb_ouverts_cartes + 110 * nb_fermes

    carte = folium.Map(
        location=list(CENTRE_CARTE),
        zoom_start=15,
        tiles="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        attr="Google",
        gesture_handling=True,
    )
    GestureHandling().add_to(carte)

    for nom, row in df.iterrows():
        places, capacite = int(row["Places"]), int(row["Capacite"])
        etat = etat_parking(row["Statut"], places, capacite)
        fond = COULEURS_ETAT[etat]
        texte = "#3a2a00" if etat == "warn" else "#ffffff"
        valeur = places if etat != "closed" else "–"

        pastille = (
            '<div style="transform:translate(-50%,-50%);display:flex;align-items:center;'
            "justify-content:center;gap:4px;min-width:44px;height:32px;padding:0 10px;"
            f"border-radius:999px;background:{fond};color:{texte};border:2px solid {SURFACE};"
            "font:700 13px system-ui,sans-serif;white-space:nowrap;"
            'box-shadow:0 2px 10px rgba(0,0,0,0.5);">'
            f'<span style="font-size:10px;opacity:0.85;">P</span>{valeur}</div>'
        )

        folium.Marker(
            location=[row["latitude"], row["longitude"]],
            icon=folium.DivIcon(html=pastille, icon_size=(0, 0), icon_anchor=(0, 0)),
            tooltip=f"{nom} : {row['Affichage']} · MAJ {row['Timestamp']}",
        ).add_to(carte)

    # Légende en surimpression sur la carte (rendue dans l'iframe folium,
    # d'où les styles en ligne).
    puce = '<i style="width:10px;height:10px;border-radius:50%;background:{};"></i>'
    item = (
        '<span style="display:inline-flex;align-items:center;gap:6px;">{}{}</span>'
    )
    legende = (
        '<div style="position:absolute;bottom:14px;left:14px;z-index:1000;'
        "display:flex;flex-wrap:wrap;gap:6px 16px;padding:9px 14px;"
        f"background:rgba(31,31,36,0.92);border:1px solid rgba(255,255,255,0.10);"
        'border-radius:10px;font:500 11.5px system-ui,sans-serif;color:#c3c2b7;">'
        + item.format(puce.format(COULEURS_ETAT["good"]), "Large (&gt; 50 % libres)")
        + item.format(puce.format(COULEURS_ETAT["warn"]), "Limité (10 à 50 %)")
        + item.format(puce.format(COULEURS_ETAT["crit"]), "Presque complet (&lt; 10 %)")
        + item.format(puce.format(COULEURS_ETAT["closed"]), "Fermé ou sans données")
        + "</div>"
    )
    carte.get_root().html.add_child(folium.Element(legende))

    st_folium(carte, height=hauteur_carte, use_container_width=True, returned_objects=[])

# ---------------------------------------------------------------------------
# Historique d'occupation
# ---------------------------------------------------------------------------

st.markdown('<div class="pk-section">Historique d\'occupation</div>', unsafe_allow_html=True)

COULEUR_PAR_PARKING = {p.nom: c for p, c in zip(PARKINGS, COULEURS_SERIES)}


@st.cache_data(ttl=CACHE_TTL_SECONDES, show_spinner=False)
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

with ecran_chargement("Chargement de l'historique..."):
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
        # dragmode + fixedrange : pas de zoom ni de sélection au doigt sur mobile,
        # le graphique reste fixe (les infobulles au survol restent actives).
        dragmode=False,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font_color="#898781",
        legend=dict(title=None, orientation="h", yanchor="bottom", y=1.02),
        margin=dict(l=10, r=10, t=10, b=10),
        xaxis=dict(gridcolor="#3d3d43", title=None, fixedrange=True),
        yaxis=dict(
            gridcolor="#3d3d43",
            title=mesure,
            range=[0, 100] if mesure == "Occupation (%)" else None,
            rangemode="tozero",
            fixedrange=True,
        ),
    )
    st.plotly_chart(
        fig,
        use_container_width=True,
        config={"scrollZoom": False, "displayModeBar": False, "doubleClick": False},
    )

st.caption("✒️ Dashboard conçu par Julien CHARLIER")
