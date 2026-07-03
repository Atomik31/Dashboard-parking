"""Job planifié : scrape les parkings et archive un snapshot dans l'historique.

Usage :
    python -m scripts.scrape_to_s3            # écrit sur S3 (S3_BUCKET requis)
    python -m scripts.scrape_to_s3 --local    # écrit dans le dossier local history/
"""
import argparse
import logging
import os
import sys

from parking_dashboard.scraper import scrape_all
from parking_dashboard.storage import ajouter_snapshot

logger = logging.getLogger(__name__)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--local",
        action="store_true",
        help="écrit dans le dossier local au lieu de S3 (développement)",
    )
    args = parser.parse_args()

    if not args.local and not os.environ.get("S3_BUCKET"):
        logger.error("S3_BUCKET n'est pas défini. Utilise --local pour écrire en local.")
        sys.exit(1)
    if args.local:
        # Force le backend local même si S3_BUCKET est défini dans l'environnement
        os.environ.pop("S3_BUCKET", None)

    data = scrape_all()
    ajouter_snapshot(data)
    logger.info("Snapshot archivé (%d parkings).", len(data))


if __name__ == "__main__":
    main()
