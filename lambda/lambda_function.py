"""Handler AWS Lambda : scrape les parkings et archive un relevé sur S3.

Déclenché par EventBridge Scheduler (rate: 10 minutes). Les identifiants AWS
proviennent du rôle d'exécution de la fonction — aucune clé d'accès à
configurer, seule la variable d'environnement S3_BUCKET est requise.
"""
import logging

from parking_dashboard.scraper import scrape_all
from parking_dashboard.storage import ajouter_snapshot

logging.getLogger().setLevel(logging.INFO)
logger = logging.getLogger(__name__)


def lambda_handler(event, context):
    data = scrape_all()
    ajouter_snapshot(data)
    logger.info("Snapshot archivé (%d parkings).", len(data))
    return {"parkings": len(data)}
