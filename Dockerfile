FROM python:3.13-slim

WORKDIR /app

# Installer les dépendances d'abord pour profiter du cache de layers Docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY parking_dashboard/ parking_dashboard/
COPY .streamlit/ .streamlit/
COPY dashboard_parking.py .

EXPOSE 8501

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8501/_stcore/health')" || exit 1

CMD ["streamlit", "run", "dashboard_parking.py", "--server.port=8501", "--server.address=0.0.0.0", "--server.headless=true"]
