"""
Mind Gym API - FastAPI backend.

Run locally:
    uvicorn app.main:app --reload --port 8000
"""

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import Base, engine
from app.routers import auth, mindgym

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("mindgym.main")

settings = get_settings()

# Create tables on startup - fine for SQLite/dev; use Alembic migrations
# instead if/when you move to a shared Postgres/Neon database.
Base.metadata.create_all(bind=engine)

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


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"error": "Internal server error.", "code": "INTERNAL_ERROR"})
