FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app/backend
COPY backend/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt \
    && useradd --create-home --uid 10001 bindr

COPY backend/app ./app
COPY backend/alembic.ini ./alembic.ini
COPY frontend /app/frontend

USER bindr
EXPOSE 8080

# App Platform terminates HTTPS and forwards requests to this service.
# Schema migrations are deliberately separate from application startup.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers", "--forwarded-allow-ips", "*"]
