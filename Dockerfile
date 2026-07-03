FROM python:3.13-slim

# Les Spaces Hugging Face exécutent le conteneur avec l'UID 1000 (non-root) ;
# tourner non-root est de toute façon une bonne pratique partout.
RUN useradd -m -u 1000 appuser
USER appuser
ENV HOME=/home/appuser \
    PATH=/home/appuser/.local/bin:$PATH

WORKDIR /app

# Installer les dépendances d'abord pour profiter du cache de layers Docker
COPY --chown=appuser requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=appuser parking_dashboard/ parking_dashboard/
COPY --chown=appuser .streamlit/ .streamlit/
COPY --chown=appuser dashboard_parking.py .

EXPOSE 8501

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8501/_stcore/health')" || exit 1

CMD ["streamlit", "run", "dashboard_parking.py", "--server.port=8501", "--server.address=0.0.0.0", "--server.headless=true"]
