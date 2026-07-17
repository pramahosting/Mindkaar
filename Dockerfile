# syntax=docker/dockerfile:1

# ============================================================
# Stage 1 - build the React frontend
# ============================================================
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
# No VITE_API_URL set here on purpose - frontend/src/api.js then defaults
# to relative (same-origin) requests, which is what a single-container
# deployment needs since the frontend and API share one origin/port.
RUN npm run build


# ============================================================
# Stage 2 - Python backend, serving the built frontend too
# ============================================================
FROM python:3.12-slim AS backend

WORKDIR /app/backend

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# System deps for psycopg2 (in case you're on Neon/Postgres rather than
# SQLite) - psycopg2-binary in requirements.txt is prebuilt, but libpq
# runtime libraries still need to be present.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

# Built frontend goes into backend/static/ - app/main.py serves it from
# there automatically if the folder exists (see app/main.py).
COPY --from=frontend-build /app/frontend/dist ./static

# Northflank sets $PORT; default to 8000 for local `docker run` testing.
ENV PORT=8000
EXPOSE 8000

# Shell form so ${PORT} expands - Northflank (and most PaaS platforms)
# inject PORT at runtime, which may differ from the EXPOSE default above.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
