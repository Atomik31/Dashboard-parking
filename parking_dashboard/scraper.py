"""Scraping des pages Semepa : récupération et extraction des places disponibles."""
import logging
import re
import time
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

from .config import (
    DELAI_ENTRE_REQUETES,
    PARKINGS,
    REQUEST_HEADERS,
    REQUEST_TIMEOUT,
    SEUIL_COMPLET,
    TIMEZONE,
    Parking,
)

logger = logging.getLogger(__name__)

RE_NB_PLACES = re.compile(r'<p class="nbPlaces"><span[^>]*>(\d+)</span>')
RE_TEXTE_PLACES = re.compile(r'<p class="nbPlaces"><span[^>]*>([^<]+)</span>')

STATUT_OUVERT = "✅ Ouvert"
STATUT_SANS_DONNEES = "❓ Pas de données"
STATUT_ERREUR = "❌ Erreur"


def parse_places(html: str) -> tuple[int | None, str | None]:
    """Extrait le nombre de places libres ou le texte de statut du HTML.

    Retourne (places, None) si un nombre est trouvé, (None, texte) si la page
    affiche un texte (ex: "COMPLET", "Fermeture temporaire"), (None, None) sinon.
    """
    match_nombre = RE_NB_PLACES.search(html)
    if match_nombre:
        return int(match_nombre.group(1)), None

    match_texte = RE_TEXTE_PLACES.search(html)
    if match_texte:
        return None, match_texte.group(1).strip()

    return None, None


def _horodatage() -> str:
    return datetime.now(ZoneInfo(TIMEZONE)).strftime("%H:%M:%S")


def _entree(parking: Parking, places: int, affichage: str, statut: str) -> dict:
    return {
        "Places": places,
        "Capacite": parking.capacite,
        "Affichage": affichage,
        "Statut": statut,
        "Timestamp": _horodatage(),
        "latitude": parking.latitude,
        "longitude": parking.longitude,
    }


def construire_entree(parking: Parking, places: int | None, texte: str | None) -> dict:
    """Construit l'entrée d'un parking à partir du résultat du parsing."""
    if places is not None:
        if places <= SEUIL_COMPLET:
            return _entree(parking, places, "COMPLET", STATUT_OUVERT)
        return _entree(parking, places, f"{places} / {parking.capacite}", STATUT_OUVERT)

    if texte is not None:
        if texte.upper() == "COMPLET":
            return _entree(parking, 0, "COMPLET", STATUT_OUVERT)
        # Texte non numérique : message de fermeture ou d'indisponibilité
        return _entree(parking, 0, texte, f"⚠️ {texte}")

    return _entree(parking, 0, "N/A", STATUT_SANS_DONNEES)


def scrape_parking(parking: Parking) -> dict:
    """Récupère la page d'un parking et en extrait les données."""
    try:
        response = requests.get(
            parking.base_url,
            params={"page_id": parking.page_id},
            headers=REQUEST_HEADERS,
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.warning("Échec de la requête pour %s: %s", parking.nom, exc)
        return _entree(parking, 0, "Erreur", STATUT_ERREUR)

    places, texte = parse_places(response.text)
    return construire_entree(parking, places, texte)


def scrape_all() -> dict[str, dict]:
    """Scrape tous les parkings, avec une pause entre chaque requête."""
    logger.info("Scraping de %d parkings...", len(PARKINGS))
    data = {}
    for parking in PARKINGS:
        data[parking.nom] = scrape_parking(parking)
        time.sleep(DELAI_ENTRE_REQUETES)
    logger.info("Scraping terminé.")
    return data
