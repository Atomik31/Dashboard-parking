"""Tests du parsing HTML et de la construction des données parking."""
import pytest

from parking_dashboard.config import PARKINGS, Parking
from parking_dashboard.scraper import (
    STATUT_OUVERT,
    STATUT_SANS_DONNEES,
    construire_entree,
    parse_places,
)

PARKING_TEST = Parking("Test", "https://example.com/", 1, 500, 43.5, 5.4)

HTML_NOMBRE = """
<div><p class="nbPlaces"><span style="font-size:30px;color:#ae0a15;">205</span> places libres</p></div>
"""

HTML_COMPLET = """
<div><p class="nbPlaces"><span style="color:#ae0a15;">COMPLET</span></p></div>
"""

HTML_FERMETURE = """
<div><p class="nbPlaces"><span>Fermeture temporaire</span></p></div>
"""

HTML_VIDE = "<html><body>Page sans données</body></html>"


class TestParsePlaces:
    def test_nombre_de_places(self):
        assert parse_places(HTML_NOMBRE) == (205, None)

    def test_texte_complet(self):
        assert parse_places(HTML_COMPLET) == (None, "COMPLET")

    def test_texte_fermeture(self):
        assert parse_places(HTML_FERMETURE) == (None, "Fermeture temporaire")

    def test_html_sans_donnees(self):
        assert parse_places(HTML_VIDE) == (None, None)


class TestConstruireEntree:
    def test_parking_ouvert(self):
        entree = construire_entree(PARKING_TEST, 205, None)
        assert entree["Places"] == 205
        assert entree["Affichage"] == "205 / 500"
        assert entree["Statut"] == STATUT_OUVERT

    @pytest.mark.parametrize("places", [0, 1, 2])
    def test_peu_de_places_affiche_complet(self, places):
        entree = construire_entree(PARKING_TEST, places, None)
        assert entree["Affichage"] == "COMPLET"
        assert entree["Statut"] == STATUT_OUVERT

    def test_texte_complet(self):
        entree = construire_entree(PARKING_TEST, None, "COMPLET")
        assert entree["Places"] == 0
        assert entree["Affichage"] == "COMPLET"
        assert entree["Statut"] == STATUT_OUVERT

    def test_texte_fermeture(self):
        entree = construire_entree(PARKING_TEST, None, "Fermeture temporaire")
        assert entree["Places"] == 0
        assert entree["Statut"] == "⚠️ Fermeture temporaire"

    def test_sans_donnees(self):
        entree = construire_entree(PARKING_TEST, None, None)
        assert entree["Affichage"] == "N/A"
        assert entree["Statut"] == STATUT_SANS_DONNEES

    def test_coordonnees_et_capacite_reportees(self):
        entree = construire_entree(PARKING_TEST, 100, None)
        assert entree["Capacite"] == 500
        assert entree["latitude"] == 43.5
        assert entree["longitude"] == 5.4


class TestConfig:
    def test_neuf_parkings_configures(self):
        assert len(PARKINGS) == 9

    def test_noms_uniques(self):
        noms = [p.nom for p in PARKINGS]
        assert len(noms) == len(set(noms))
