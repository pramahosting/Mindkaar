"""
Quiet Hours API — FastAPI backend that proxies scenario/question generation
to Groq, keeping the Groq API key server-side.

Run locally:
    uvicorn app.main:app --reload --port 8000

Then point the frontend at http://localhost:8000/api/topics and
http://localhost:8000/api/questions instead of calling Groq directly.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import scenarios

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("quiet_hours.main")

settings = get_settings()

app = FastAPI(
    title="Quiet Hours API",
    description="Generates reflection topics and scenario questions via Groq.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(scenarios.router)


@app.get("/health")
async def health() -> dict:
    """Simple liveness check — does not call Groq."""
    return {"status": "ok"}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Last-resort safety net so an unexpected bug never returns a bare 500
    with no context — every failure still comes back as clean JSON."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error.", "code": "INTERNAL_ERROR"},
    )
