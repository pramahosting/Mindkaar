"""
Mind Gym API - FastAPI backend.

Run locally (API only, frontend served separately by Vite):
    uvicorn app.main:app --reload --port 8000

In a single-container deployment (see the root Dockerfile), the frontend
is built into backend/static/ and this app serves it directly alongside
the API, so the whole app runs behind one port.
"""

import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.migrate import run_lightweight_migrations
from app.routers import auth, mindgym, simulation
from app.seed import seed_catalog
from app import sim_models  # noqa: F401 - registers sim_* tables with Base.metadata
from app.sim_seed import seed_sim_if_empty

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("mindgym.main")

settings = get_settings()

# Create any brand-new tables, then add any new columns to tables that
# already existed (create_all alone never alters existing tables).
Base.metadata.create_all(bind=engine)
run_lightweight_migrations(engine)

with SessionLocal() as _seed_db:
    seed_catalog(_seed_db)

with SessionLocal() as _sim_seed_db:
    seed_sim_if_empty(_sim_seed_db)

app = FastAPI(
    title="Mind Gym API",
    description="Profile -> scenario -> ranked questions -> mini-game -> mental-status assessment, powered by Groq.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(mindgym.router)
app.include_router(simulation.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"error": "Internal server error.", "code": "INTERNAL_ERROR"})


# ── Serve the built frontend, if present (single-container deployment) ──
# Registered LAST so it never shadows the /api/... and /health routes
# above - Starlette matches routes in registration order, and this only
# catches whatever nothing else matched.
_STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")

if os.path.isdir(_STATIC_DIR):
    _assets_dir = os.path.join(_STATIC_DIR, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="frontend-assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        candidate = os.path.join(_STATIC_DIR, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        # Any other path (client-side routes like /login, /profile, /games,
        # /session, /results) falls back to index.html so React Router can
        # handle it.
        return FileResponse(os.path.join(_STATIC_DIR, "index.html"))
else:
    logger.info("No frontend build found at %s - running API-only (normal for local dev).", _STATIC_DIR)
