"""Tests du stockage de l'historique (fichier CSV unique, backend local)."""
from datetime import datetime, timezone

import pytest

from parking_dashboard.config import COULEURS_SERIES, PARKINGS
from parking_dashboard.storage import (
    COLONNES,
    ajouter_snapshot,
    charger_historique,
    construire_lignes,
    lire_historique_brut,
)

SNAPSHOT = {
    "Rotonde": {
        "Places": 300,
        "Capacite": 1800,
        "Affichage": "300 / 1800",
        "Statut": "✅ Ouvert",
        "Timestamp": "10:00:00",
        "latitude": 43.5,
        "longitude": 5.4,
    },
    "Cardeurs": {
        "Places": 20,
        "Capacite": 125,
        "Affichage": "20 / 125",
        "Statut": "✅ Ouvert",
        "Timestamp": "10:00:00",
        "latitude": 43.5,
        "longitude": 5.4,
    },
}

# 10:00 UTC un 3 juillet = 12:00 heure de Paris (été, UTC+2)
QUAND = datetime(2026, 7, 3, 10, 0, 0, tzinfo=timezone.utc)


@pytest.fixture
def dossier_historique(tmp_path, monkeypatch):
    """Backend local isolé dans un dossier temporaire, sans S3."""
    monkeypatch.delenv("S3_BUCKET", raising=False)
    monkeypatch.setenv("HISTORY_DIR", str(tmp_path))
    return tmp_path


class TestConstruireLignes:
    def test_une_ligne_par_parking_triees(self):
        lignes = construire_lignes(SNAPSHOT, QUAND)
        assert len(lignes) == 2
        assert [l[3] for l in lignes] == ["Cardeurs", "Rotonde"]

    def test_schema_complet(self):
        ligne = construire_lignes(SNAPSHOT, QUAND)[1]
        assert ligne == [
            "2026-07-03T10:00:00+00:00",  # timestamp_utc
            "2026-07-03",                 # date locale
            "12:00:00",                   # heure locale Paris (UTC+2 en été)
            "Rotonde",
            300,                          # places_dispo
            1800,                         # places_total
            "✅ Ouvert",
        ]

    def test_date_locale_differe_du_jour_utc_apres_minuit(self):
        # 22:30 UTC = 00:30 à Paris le lendemain : la date locale doit basculer
        tard = datetime(2026, 7, 3, 22, 30, 0, tzinfo=timezone.utc)
        ligne = construire_lignes(SNAPSHOT, tard)[0]
        assert ligne[1] == "2026-07-04"
        assert ligne[2] == "00:30:00"


class TestAjouterSnapshot:
    def test_premier_snapshot_cree_le_fichier_avec_entete(self, dossier_historique):
        ajouter_snapshot(SNAPSHOT, QUAND)
        contenu = lire_historique_brut()
        lignes = contenu.strip().splitlines()
        assert lignes[0] == ",".join(COLONNES)
        assert len(lignes) == 1 + len(SNAPSHOT)

    def test_snapshots_successifs_dans_le_meme_fichier(self, dossier_historique):
        ajouter_snapshot(SNAPSHOT, QUAND)
        ajouter_snapshot(SNAPSHOT, QUAND.replace(minute=10))
        ajouter_snapshot(SNAPSHOT, QUAND.replace(minute=20))
        contenu = lire_historique_brut()
        lignes = contenu.strip().splitlines()
        assert len(lignes) == 1 + 3 * len(SNAPSHOT)
        # Un seul en-tête, pas un par snapshot
        assert sum(1 for l in lignes if l.startswith("timestamp_utc")) == 1


class TestChargerHistorique:
    def test_vide_sans_donnees(self, dossier_historique):
        df = charger_historique(24, maintenant=QUAND)
        assert df.empty
        assert list(df.columns) == COLONNES

    def test_filtre_sur_la_plage_demandee(self, dossier_historique):
        vieux = QUAND.replace(hour=1)
        recent = QUAND.replace(hour=9)
        ajouter_snapshot(SNAPSHOT, vieux)
        ajouter_snapshot(SNAPSHOT, recent)
        df = charger_historique(2, maintenant=QUAND)  # fenêtre 08:00 -> 10:00 UTC
        assert len(df) == len(SNAPSHOT)
        assert (df["timestamp_utc"].dt.hour == 9).all()

    def test_types_et_tri(self, dossier_historique):
        ajouter_snapshot(SNAPSHOT, QUAND.replace(hour=9))
        ajouter_snapshot(SNAPSHOT, QUAND.replace(hour=8))
        df = charger_historique(6, maintenant=QUAND)
        assert df["timestamp_utc"].is_monotonic_increasing
        assert df["places_dispo"].dtype.kind == "i"
        assert df["places_total"].dtype.kind == "i"


class TestPalette:
    def test_une_couleur_par_parking(self):
        assert len(COULEURS_SERIES) == len(PARKINGS)

    def test_couleurs_uniques(self):
        assert len(set(COULEURS_SERIES)) == len(COULEURS_SERIES)
