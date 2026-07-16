import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth_utils import get_current_user
from app.config import get_settings
from app.database import get_db
from app.game_logic import fallback_status, get_game_for_scenario
from app.groq_client import GroqCallError, generate_structured_json
from app.models import GameResult, MindProfile, User
from app.prompts import (
    BASE_SYSTEM_PROMPT,
    QUESTIONS_JSON_SCHEMA,
    SCENARIO_JSON_SCHEMA,
    STATUS_JSON_SCHEMA,
    build_questions_prompt,
    build_scenario_prompt,
    build_status_prompt,
)
from app.schemas import (
    GameConfig,
    ProfileIn,
    QuestionsRequest,
    QuestionsResponse,
    ScenarioCandidate,
    ScenarioRequest,
    ScenarioResponse,
    ScoreRequest,
    ScoreResponse,
)

logger = logging.getLogger("mindgym.routes")
router = APIRouter(prefix="/api/mindgym", tags=["mindgym"])
settings = get_settings()

_STATUS_BY_CODE = {
    "AUTH_ERROR": 500,
    "RATE_LIMIT": 429,
    "BAD_REQUEST": 502,
    "TIMEOUT": 504,
    "NETWORK_ERROR": 502,
    "PARSE_ERROR": 502,
    "EMPTY_RESPONSE": 502,
    "API_ERROR": 502,
}


def _raise_http(err: GroqCallError) -> None:
    raise HTTPException(status_code=_STATUS_BY_CODE.get(err.code, 502), detail={"error": err.message, "code": err.code})


@router.post("/profile")
def save_profile(
    payload: ProfileIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = MindProfile(
        user_id=current_user.id,
        age=payload.age,
        mood=payload.mood,
        sleep_hours=payload.sleepHours,
        stress_level=payload.stressLevel,
        support=payload.support,
        goals=payload.goals,
    )
    db.add(profile)
    db.flush()
    db.refresh(profile)
    return {"profile_id": profile.id}


@router.post("/scenario", response_model=ScenarioResponse)
async def identify_scenario(payload: ScenarioRequest, current_user: User = Depends(get_current_user)):
    try:
        candidates_raw = await generate_structured_json(
            system_prompt=BASE_SYSTEM_PROMPT,
            user_prompt=build_scenario_prompt(payload.profile),
            schema_name="mindgym_scenario",
            schema=SCENARIO_JSON_SCHEMA,
            result_key="candidates",
            model=payload.model,
            timeout_seconds=settings.scenario_timeout_seconds,
        )
    except GroqCallError as err:
        logger.error("Scenario identification failed: %s (%s)", err.message, err.code)
        _raise_http(err)

    candidates = [ScenarioCandidate(**c) for c in candidates_raw]
    candidates.sort(key=lambda c: c.relevance, reverse=True)
    if not candidates:
        raise HTTPException(status_code=502, detail={"error": "No scenario candidates returned.", "code": "EMPTY_RESPONSE"})

    return ScenarioResponse(primary=candidates[0], candidates=candidates)


@router.post("/questions", response_model=QuestionsResponse)
async def get_questions(payload: QuestionsRequest, current_user: User = Depends(get_current_user)):
    if not payload.scenario or not payload.scenario.strip():
        raise HTTPException(status_code=422, detail={"error": "A non-empty 'scenario' is required.", "code": "BAD_REQUEST"})

    try:
        questions_raw = await generate_structured_json(
            system_prompt=BASE_SYSTEM_PROMPT,
            user_prompt=build_questions_prompt(payload.profile, payload.scenario),
            schema_name="mindgym_questions",
            schema=QUESTIONS_JSON_SCHEMA,
            result_key="questions",
            model=payload.model,
            timeout_seconds=settings.questions_timeout_seconds,
        )
    except GroqCallError as err:
        logger.error("Question generation failed for '%s': %s (%s)", payload.scenario, err.message, err.code)
        _raise_http(err)

    # (d) Rank questions by answer complexity ascending: simplest first, most complex last.
    questions_raw.sort(key=lambda q: q.get("difficulty", 0))
    for idx, q in enumerate(questions_raw, start=1):
        q["id"] = idx

    return QuestionsResponse(questions=questions_raw)


@router.get("/game/{scenario}", response_model=GameConfig)
def get_game(scenario: str, current_user: User = Depends(get_current_user)):
    return get_game_for_scenario(scenario)


@router.post("/score", response_model=ScoreResponse)
async def submit_score(
    payload: ScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        assessment_raw = await generate_structured_json(
            system_prompt=BASE_SYSTEM_PROMPT,
            user_prompt=build_status_prompt(
                payload.profile, payload.scenario, payload.score, payload.max_level, payload.chopped, payload.missed
            ),
            schema_name="mindgym_status",
            schema=STATUS_JSON_SCHEMA,
            result_key="assessment",
            model=payload.model,
            timeout_seconds=settings.status_timeout_seconds,
        )
        assessment = assessment_raw[0]
    except GroqCallError as err:
        logger.warning("Status generation failed, using deterministic fallback: %s (%s)", err.message, err.code)
        assessment = fallback_status(payload.score, payload.max_level, payload.chopped, payload.missed)

    result = GameResult(
        user_id=current_user.id,
        scenario=payload.scenario,
        game_id=payload.game_id,
        score=payload.score,
        max_level=payload.max_level,
        chopped=payload.chopped,
        missed=payload.missed,
        mental_status=assessment["status"],
        summary=assessment["summary"],
        tip=assessment["tip"],
    )
    db.add(result)

    return ScoreResponse(
        mental_status=assessment["status"],
        summary=assessment["summary"],
        tip=assessment["tip"],
        score=payload.score,
        max_level=payload.max_level,
    )
