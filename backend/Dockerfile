# TASCK API image (Azure Container Apps: tasck-api).
#
# Recovered from the production image tasck-api:migration-closeout-20260909-ba0009c
# (sha256:ad71cae19e3cf813e2b34557f5b0a418f1d37ad7f363ee35ff17e1e645e9e9e1).
# Build context: backend/
#
# Configuration and secrets come from the Container App environment at runtime.
# Nothing from .env is copied into the image (see .dockerignore).
FROM python:3.11.16-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    APP_ENV=production \
    PORT=8000

WORKDIR /app

# fonts-dejavu-core: PDF/DOCX rendering. curl: HEALTHCHECK.
RUN apt-get update \
    && apt-get install -y --no-install-recommends fonts-dejavu-core curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 tasck

COPY requirements.txt ./requirements.txt
RUN pip install --requirement requirements.txt

COPY . ./
RUN chown -R tasck:tasck /app

USER tasck
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/api/health" || exit 1

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT} --workers 1 --proxy-headers --forwarded-allow-ips='*' --timeout-keep-alive 75"]
