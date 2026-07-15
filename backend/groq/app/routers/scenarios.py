"""
Routes for scenario generation:
  POST /api/topics     — phase 1: generate topic list from a profile
  POST /api/questions  — phase 2: generate 10 questions for one topic
"""

import logging

from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.groq_client import GroqCallError, generate_structured_json
from app.prompts import (
    BASE_SYSTEM_PROMPT,
    QUESTIONS_JSON_SCHEMA,
    TOPICS_JSON_SCHEMA,
    build_questions_prompt,
    build_topics_prompt,
)
from app.schemas import QuestionsRequest, QuestionsResponse, TopicsRequest, TopicsResponse

logger = logging.getLogger("quiet_hours.routes")
router = APIRouter(prefix="/api", tags=["scenarios"])
settings = get_settings()

# Maps our internal error codes to HTTP status codes.
_STATUS_BY_CODE = {
    "AUTH_ERROR": 500,       # the server's own key is bad — not the caller's fault
    "RATE_LIMIT": 429,
    "BAD_REQUEST": 502,
    "TIMEOUT": 504,
    "NETWORK_ERROR": 502,
    "PARSE_ERROR": 502,
    "EMPTY_RESPONSE": 502,
    "API_ERROR": 502,
}


def _raise_http(err: GroqCallError) -> None:
    status_code = _STATUS_BY_CODE.get(err.code, 502)
    raise HTTPException(status_code=status_code, detail={"error": err.message, "code": err.code})


@router.post("/topics", response_model=TopicsResponse)
async def get_topics(payload: TopicsRequest) -> TopicsResponse:
    try:
        topics = await generate_structured_json(
            system_prompt=BASE_SYSTEM_PROMPT,
            user_prompt=build_topics_prompt(payload.profile),
            schema_name="quiet_hours_topics",
            schema=TOPICS_JSON_SCHEMA,
            result_key="topics",
            model=payload.model,
            timeout_seconds=settings.topics_timeout_seconds,
        )
    except GroqCallError as err:
        logger.error("Topic generation failed: %s (%s)", err.message, err.code)
        _raise_http(err)

    return TopicsResponse(topics=topics)


@router.post("/questions", response_model=QuestionsResponse)
async def get_questions(payload: QuestionsRequest) -> QuestionsResponse:
    if not payload.topic or not payload.topic.strip():
        raise HTTPException(
            status_code=422,
            detail={"error": "A non-empty 'topic' is required.", "code": "BAD_REQUEST"},
        )

    try:
        questions = await generate_structured_json(
            system_prompt=BASE_SYSTEM_PROMPT,
            user_prompt=build_questions_prompt(payload.profile, payload.topic),
            schema_name="quiet_hours_questions",
            schema=QUESTIONS_JSON_SCHEMA,
            result_key="questions",
            model=payload.model,
            timeout_seconds=settings.questions_timeout_seconds,
        )
    except GroqCallError as err:
        logger.error(
            "Question generation failed for topic '%s': %s (%s)",
            payload.topic,
            err.message,
            err.code,
        )
        _raise_http(err)

    return QuestionsResponse(questions=questions)
