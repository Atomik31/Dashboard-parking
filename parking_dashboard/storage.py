"""Historique des relevés : un fichier CSV par jour, stocké sur S3 ou en local.

Le backend est choisi par l'environnement :
- si S3_BUCKET est défini, lecture/écriture sur S3 (clés `history/AAAA-MM-JJ.csv`) ;
- sinon, dans un dossier local (HISTORY_DIR, par défaut `history/`), pratique
  pour le développement et les tests.
"""
import csv
import io
import logging
import os
from datetime import date, datetime, timedelta, timezone

logger = logging.getLogger(__name__)

COLONNES = ["timestamp_utc", "parking", "places", "capacite", "statut"]
PREFIXE_S3 = "history/"
DOSSIER_LOCAL_DEFAUT = "history"


def _bucket() -> str | None:
    return os.environ.get("S3_BUCKET") or None


def _dossier_local() -> str:
    return os.environ.get("HISTORY_DIR", DOSSIER_LOCAL_DEFAUT)


def _nom_fichier(jour: date) -> str:
    return f"{jour.isoformat()}.csv"


def lire_jour(jour: date) -> str | None:
    """Retourne le contenu CSV du jour demandé, ou None s'il n'existe pas."""
    bucket = _bucket()
    if bucket:
        import boto3

        s3 = boto3.client("s3")
        cle = PREFIXE_S3 + _nom_fichier(jour)
        try:
            objet = s3.get_object(Bucket=bucket, Key=cle)
        except s3.exceptions.NoSuchKey:
            return None
        return objet["Body"].read().decode("utf-8")

    chemin = os.path.join(_dossier_local(), _nom_fichier(jour))
    if not os.path.exists(chemin):
        return None
    with open(chemin, encoding="utf-8") as f:
        return f.read()


def ecrire_jour(jour: date, contenu: str) -> None:
    """Écrit (ou remplace) le fichier CSV du jour demandé."""
    bucket = _bucket()
    if bucket:
        import boto3

        s3 = boto3.client("s3")
        cle = PREFIXE_S3 + _nom_fichier(jour)
        s3.put_object(Bucket=bucket, Key=cle, Body=contenu.encode("utf-8"), ContentType="text/csv")
        logger.info("Écrit s3://%s/%s (%d octets)", bucket, cle, len(contenu))
        return

    dossier = _dossier_local()
    os.makedirs(dossier, exist_ok=True)
    chemin = os.path.join(dossier, _nom_fichier(jour))
    with open(chemin, "w", encoding="utf-8") as f:
        f.write(contenu)
    logger.info("Écrit %s (%d octets)", chemin, len(contenu))


def construire_lignes(data: dict[str, dict], quand: datetime) -> list[list]:
    """Transforme un snapshot de scraping en lignes CSV (une par parking)."""
    horodatage = quand.astimezone(timezone.utc).isoformat(timespec="seconds")
    return [
        [horodatage, nom, entree["Places"], entree["Capacite"], entree["Statut"]]
        for nom, entree in sorted(data.items())
    ]


def ajouter_snapshot(data: dict[str, dict], quand: datetime | None = None) -> None:
    """Ajoute un snapshot au fichier CSV du jour (créé avec en-tête si besoin)."""
    quand = quand or datetime.now(timezone.utc)
    jour = quand.astimezone(timezone.utc).date()

    existant = lire_jour(jour)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    if existant is None:
        writer.writerow(COLONNES)
    else:
        buffer.write(existant)
    writer.writerows(construire_lignes(data, quand))

    ecrire_jour(jour, buffer.getvalue())


def charger_historique(heures: int, maintenant: datetime | None = None):
    """Charge l'historique des `heures` dernières heures dans un DataFrame.

    Retourne un DataFrame (éventuellement vide) avec les colonnes de COLONNES,
    timestamp_utc parsé en datetime UTC.
    """
    import pandas as pd

    maintenant = maintenant or datetime.now(timezone.utc)
    debut = maintenant - timedelta(hours=heures)

    morceaux = []
    jour = debut.astimezone(timezone.utc).date()
    dernier_jour = maintenant.astimezone(timezone.utc).date()
    while jour <= dernier_jour:
        contenu = lire_jour(jour)
        if contenu:
            morceaux.append(pd.read_csv(io.StringIO(contenu)))
        jour += timedelta(days=1)

    if not morceaux:
        return pd.DataFrame(columns=COLONNES)

    df = pd.concat(morceaux, ignore_index=True)
    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True)
    df = df[(df["timestamp_utc"] >= debut) & (df["timestamp_utc"] <= maintenant)]
    return df.sort_values("timestamp_utc").reset_index(drop=True)
