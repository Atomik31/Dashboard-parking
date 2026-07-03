"""Configuration des parkings surveillés et constantes du scraping."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Parking:
    nom: str
    base_url: str
    page_id: int
    capacite: int
    latitude: float
    longitude: float


PARKINGS: list[Parking] = [
    Parking("Bellegarde", "https://mamp.parkings-semepa.fr/", 213, 340, 43.5322096, 5.4502100),
    Parking("Cardeurs", "https://mamp.parkings-semepa.fr/", 219, 125, 43.5298981, 5.4458118),
    Parking("Carnot", "https://mamp.parkings-semepa.fr/", 211, 675, 43.5255598, 5.4554612),
    Parking("Méjanes", "https://mamp.parkings-semepa.fr/", 150, 800, 43.5239974, 5.4413805),
    Parking("Mignet", "https://mamp.parkings-semepa.fr/", 209, 800, 43.52425, 5.4476974),
    Parking("Pasteur", "https://mamp.parkings-semepa.fr/", 215, 650, 43.5339951, 5.4462335),
    Parking("Rambot", "https://parkings-semepa.fr/", 221, 400, 43.5304833, 5.4580851),
    Parking("Rotonde", "https://parkings-semepa.fr/", 206, 1800, 43.5253922, 5.4440594),
    Parking("Signoret", "https://mamp.parkings-semepa.fr/", 217, 350, 43.5333509, 5.4486254),
]

REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
REQUEST_TIMEOUT = 5

# Pause entre deux requêtes pour ménager le site source
DELAI_ENTRE_REQUETES = 0.5

# Durée de vie du cache Streamlit (partagé entre toutes les sessions)
CACHE_TTL_SECONDES = 600

TIMEZONE = "Europe/Paris"

# En dessous de ce nombre de places, le parking est affiché comme complet
SEUIL_COMPLET = 2

# Centre de la carte (Aix-en-Provence)
CENTRE_CARTE = (43.52829276, 5.4525416)

# Couleur fixe par parking pour le graphique d'historique (même ordre que PARKINGS).
# Palette validée pour le fond sombre (#0e1117) : contraste >= 3:1 et
# séparation daltonisme des paires adjacentes ΔE >= 24.
COULEURS_SERIES = [
    "#3987e5",  # Bellegarde
    "#e66767",  # Cardeurs
    "#1795a9",  # Carnot
    "#d95926",  # Méjanes
    "#9085e9",  # Mignet
    "#008300",  # Pasteur
    "#d55181",  # Rambot
    "#c98500",  # Rotonde
    "#199e70",  # Signoret
]

# Plages d'affichage de l'historique (libellé -> nombre d'heures)
PLAGES_HISTORIQUE = {"1 h": 1, "6 h": 6, "12 h": 12, "24 h": 24}
