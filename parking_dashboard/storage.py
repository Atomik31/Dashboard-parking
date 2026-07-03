"""Historique des relevés : un fichier CSV unique, stocké sur S3 ou en local.

Schéma pensé pour une ingestion ultérieure en base (RDS, DuckDB, pandas...) :

    timestamp_utc, date, heure, parking, places_dispo, places_total, statut

- timestamp_utc : ISO 8601 UTC — clé canonique pour trier/dédupliquer
- date, heure   : heure locale Europe/Paris, pratiques pour l'analyse
- places_dispo / places_total : entiers

Le backend est choisi par l'environnement :
- si S3_BUCKET est défini, lecture/écriture sur S3 (clé `history/parkings.csv`) ;
- sinon, dans un dossier local (HISTORY_DIR, par défaut `history/`), pratique
  pour le développement et les tests.
"""
import csv
import io
import logging
import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from .config import TIMEZONE

logger = logging.getLogger(__name__)

COLONNES = ["timestamp_utc", "date", "heure", "parking", "places_dispo", "places_total", "statut"]
CLE_S3 = "history/parkings.csv"
DOSSIER_LOCAL_DEFAUT = "history"
NOM_FICHIER = "parkings.csv"


def _bucket() -> str | None:
    return os.environ.get("S3_BUCKET") or None


def _chemin_local() -> str:
    return os.path.join(os.environ.get("HISTORY_DIR", DOSSIER_LOCAL_DEFAUT), NOM_FICHIER)


def lire_historique_brut() -> str | None:
    """Retourne le contenu du fichier CSV d'historique, ou None s'il n'existe pas."""
    bucket = _bucket()
    if bucket:
        import boto3

        s3 = boto3.client("s3")
        try:
            objet = s3.get_object(Bucket=bucket, Key=CLE_S3)
        except s3.exceptions.NoSuchKey:
            return None
        return objet["Body"].read().decode("utf-8")

    chemin = _chemin_local()
    if not os.path.exists(chemin):
        return None
    with open(chemin, encoding="utf-8") as f:
        return f.read()


def ecrire_historique_brut(contenu: str) -> None:
    """Écrit (ou remplace) le fichier CSV d'historique."""
    bucket = _bucket()
    if bucket:
        import boto3

        s3 = boto3.client("s3")
        s3.put_object(Bucket=bucket, Key=CLE_S3, Body=contenu.encode("utf-8"), ContentType="text/csv")
        logger.info("Écrit s3://%s/%s (%d octets)", bucket, CLE_S3, len(contenu))
        return

    chemin = _chemin_local()
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    with open(chemin, "w", encoding="utf-8") as f:
        f.write(contenu)
    logger.info("Écrit %s (%d octets)", chemin, len(contenu))


def construire_lignes(data: dict[str, dict], quand: datetime) -> list[list]:
    """Transforme un snapshot de scraping en lignes CSV (une par parking)."""
    quand_utc = quand.astimezone(timezone.utc)
    quand_local = quand_utc.astimezone(ZoneInfo(TIMEZONE))
    horodatage = quand_utc.isoformat(timespec="seconds")
    date_locale = quand_local.strftime("%Y-%m-%d")
    heure_locale = quand_local.strftime("%H:%M:%S")
    return [
        [horodatage, date_locale, heure_locale, nom, entree["Places"], entree["Capacite"], entree["Statut"]]
        for nom, entree in sorted(data.items())
    ]


def ajouter_snapshot(data: dict[str, dict], quand: datetime | None = None) -> None:
    """Ajoute un snapshot au fichier d'historique (créé avec en-tête si besoin)."""
    quand = quand or datetime.now(timezone.utc)

    existant = lire_historique_brut()
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    if existant is None:
        writer.writerow(COLONNES)
    else:
        buffer.write(existant)
    writer.writerows(construire_lignes(data, quand))

    ecrire_historique_brut(buffer.getvalue())


def charger_historique(heures: int, maintenant: datetime | None = None):
    """Charge l'historique des `heures` dernières heures dans un DataFrame.

    Retourne un DataFrame (éventuellement vide) avec les colonnes de COLONNES,
    timestamp_utc parsé en datetime UTC, trié chronologiquement.
    """
    import pandas as pd

    maintenant = maintenant or datetime.now(timezone.utc)
    debut = maintenant - timedelta(hours=heures)

    contenu = lire_historique_brut()
    if not contenu:
        return pd.DataFrame(columns=COLONNES)

    df = pd.read_csv(io.StringIO(contenu))
    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True)
    df = df[(df["timestamp_utc"] >= debut) & (df["timestamp_utc"] <= maintenant)]
    return df.sort_values("timestamp_utc").reset_index(drop=True)
