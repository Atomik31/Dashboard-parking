#!/usr/bin/env bash
# Construit le package de déploiement Lambda : dist/lambda-scraper.zip
# Contenu : parking_dashboard/ + requests (boto3 est déjà fourni par le runtime Lambda).
set -euo pipefail

cd "$(dirname "$0")/.."

rm -rf build/lambda dist
mkdir -p build/lambda dist

# Cibler la plateforme des Lambda (Linux ARM64 / Graviton), pas celle du poste de build
python3 -m pip install --quiet --target build/lambda \
    --platform manylinux2014_aarch64 --implementation cp \
    --python-version 3.13 --only-binary=:all: requests
cp -r parking_dashboard build/lambda/
cp lambda/lambda_function.py build/lambda/

(cd build/lambda && zip -qr ../../dist/lambda-scraper.zip . -x '*__pycache__*')

echo "✅ Package prêt : dist/lambda-scraper.zip ($(du -h dist/lambda-scraper.zip | cut -f1))"
