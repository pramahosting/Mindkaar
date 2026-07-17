import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.assessment import SCENARIO_CATEGORIES, score_scenarios, triage_categories
from app.auth_utils import get_current_user
from app.config import get_settings
from app.database import get_db
from app.game_logic import fallback_status
from app.groq_client import GroqCallError, generate_structured_json
from app.models import (
    Assessment,
    AssessmentAnswer,
    AssessmentItem,
    GameSession,
    ScenarioCategory,
    ScenarioGame,
    ScenarioScore,
    User,
    UserGameProgress,
)
from app.prompts import (
    BASE_SYSTEM_PROMPT,
    QUESTIONS_JSON_SCHEMA,
    STATUS_JSON_SCHEMA,
    build_questions_prompt,
    build_status_prompt,
)
from app.schemas import (
    AssessmentItemOut,
    AssessmentResponse,
    LatestAssessmentResponse,
    MeStatusResponse,
    ProfileIn,
    QuestionsRequest,
    QuestionsResponse,
    ScenarioCandidate,
    ScenarioGameOut,
    ScenarioGamesResponse,
    ScenarioResponse,
    ScoreRequest,
    ScoreResponse,
    TriageResponse,
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


@router.get("/assessment", response_model=AssessmentResponse)
def get_assessment_items(
    categories: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the Likert item bank. If `categories` is given (comma-separated
    category codes, e.g. 'stress,anxiety,burnout'), only items for those
    categories are returned - this is what keeps the intake from asking all
    24 questions at once; the frontend calls /triage first to pick which
    categories are actually relevant to this person."""
    query = (
        db.query(AssessmentItem, ScenarioCategory)
        .join(ScenarioCategory, AssessmentItem.category_id == ScenarioCategory.id)
    )
    if categories:
        wanted = [c.strip() for c in categories.split(",") if c.strip()]
        query = query.filter(ScenarioCategory.code.in_(wanted))

    rows = query.order_by(ScenarioCategory.id, AssessmentItem.sort_order).all()
    items = [AssessmentItemOut(code=item.code, category=category.code, text=item.text) for item, category in rows]
    return AssessmentResponse(items=items, scale=[{"value": 0, "label": "Not at all"},
                                                   {"value": 1, "label": "Several days"},
                                                   {"value": 2, "label": "More than half the days"},
                                                   {"value": 3, "label": "Nearly every day"}])


@router.post("/triage", response_model=TriageResponse)
def triage(payload: ProfileIn, current_user: User = Depends(get_current_user)):
    """Deterministic, keyword-based triage (no LLM call) over the
    open-ended context fields - picks 2-3 categories worth asking about
    in depth, instead of showing all 6 categories / 24 questions at once."""
    signals = [payload.mood, payload.goals, payload.support, payload.workStatus, payload.familyProfile]
    recommended = triage_categories(signals)
    return TriageResponse(
        recommended=recommended,
        categories=[{"code": c["code"], "label": c["label"]} for c in SCENARIO_CATEGORIES],
    )


@router.get("/profile/latest", response_model=LatestAssessmentResponse)
def get_latest_assessment(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns the person's most recently submitted intake so the frontend
    can pre-fill the form with it, instead of showing it blank - useful
    when they navigate to /profile in a session where it was never
    fetched yet (e.g. straight from login -> games -> back to review)."""
    latest = (
        db.query(Assessment)
        .filter(Assessment.user_id == current_user.id)
        .order_by(Assessment.id.desc())
        .first()
    )
    if latest is None:
        return LatestAssessmentResponse(exists=False)

    answer_rows = (
        db.query(AssessmentAnswer, AssessmentItem)
        .join(AssessmentItem, AssessmentAnswer.item_id == AssessmentItem.id)
        .filter(AssessmentAnswer.assessment_id == latest.id)
        .all()
    )
    answers = {item.code: answer.value for answer, item in answer_rows}
    categories = sorted({item.category.code for _, item in answer_rows})

    return LatestAssessmentResponse(
        exists=True,
        age=latest.age,
        familyProfile=latest.family_profile,
        education=latest.education,
        workStatus=latest.work_status,
        children=latest.children,
        mood=latest.mood,
        sleepHours=latest.sleep_hours,
        support=latest.support,
        goals=latest.goals,
        assessment=answers,
        categories=categories,
    )


@router.get("/me/status", response_model=MeStatusResponse)
def get_my_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Drives the 'skip straight to the game' behavior on login: if this
    user has already completed the assessment before, the frontend uses
    this to jump straight to their most recent scenario instead of asking
    them to fill out the intake form again."""
    latest = (
        db.query(Assessment)
        .filter(Assessment.user_id == current_user.id)
        .order_by(Assessment.id.desc())
        .first()
    )
    if latest is None:
        return MeStatusResponse(has_assessment=False)

    top_score = (
        db.query(ScenarioScore, ScenarioCategory)
        .join(ScenarioCategory, ScenarioScore.category_id == ScenarioCategory.id)
        .filter(ScenarioScore.assessment_id == latest.id)
        .order_by(ScenarioScore.relevance.desc())
        .first()
    )
    latest_scenario = None
    if top_score:
        score, category = top_score
        latest_scenario = ScenarioCandidate(id=category.code, label=category.label, relevance=score.relevance, reason=score.reason)

    return MeStatusResponse(has_assessment=True, latest_assessment_id=latest.id, latest_scenario=latest_scenario)


@router.post("/profile", response_model=ScenarioResponse)
def save_profile(
    payload: ProfileIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Saves the assessment submission (1 row) + every individual Likert
    answer (1 row each, 1NF) + the computed per-category scores (1 row
    each), then returns the identified scenario. Nothing here calls an
    LLM - scoring is deterministic from the person's own answers."""
    assessment = Assessment(
        user_id=current_user.id,
        age=payload.age,
        family_profile=payload.familyProfile,
        education=payload.education,
        work_status=payload.workStatus,
        children=payload.children,
        mood=payload.mood,
        sleep_hours=payload.sleepHours,
        stress_level=payload.stressLevel,
        support=payload.support,
        goals=payload.goals,
    )
    db.add(assessment)
    db.flush()

    item_rows = db.query(AssessmentItem).filter(AssessmentItem.code.in_(payload.assessment.keys())).all()
    item_id_by_code = {item.code: item.id for item in item_rows}
    for code, value in payload.assessment.items():
        item_id = item_id_by_code.get(code)
        if item_id is None:
            continue
        db.add(AssessmentAnswer(assessment_id=assessment.id, item_id=item_id, value=value))

    scored = score_scenarios(payload.assessment)
    category_by_code = {c.code: c for c in db.query(ScenarioCategory).all()}

    candidates = []
    for row in scored:
        category = category_by_code[row["category"]]
        db.add(
            ScenarioScore(
                assessment_id=assessment.id,
                category_id=category.id,
                relevance=row["relevance"],
                reason=row["reason"],
            )
        )
        candidates.append(ScenarioCandidate(id=row["category"], label=row["label"], relevance=row["relevance"], reason=row["reason"]))

    db.flush()

    if not candidates:
        raise HTTPException(status_code=422, detail={"error": "No assessment answers were provided.", "code": "BAD_REQUEST"})

    return ScenarioResponse(assessment_id=assessment.id, primary=candidates[0], candidates=candidates)


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

    # Rank questions by answer complexity ascending: simplest first, most complex last.
    questions_raw.sort(key=lambda q: q.get("difficulty", 0))
    for idx, q in enumerate(questions_raw, start=1):
        q["id"] = idx

    return QuestionsResponse(questions=questions_raw)


@router.get("/scenario-games/{scenario_code}", response_model=ScenarioGamesResponse)
def get_scenario_games(
    scenario_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists every game available for this scenario (multiple games per
    scenario, the person picks whichever they like), each annotated with
    this user's own progress - or defaults if they've never played it."""
    category = db.query(ScenarioCategory).filter_by(code=scenario_code).first()
    if category is None:
        raise HTTPException(status_code=404, detail={"error": f"Unknown scenario '{scenario_code}'.", "code": "BAD_REQUEST"})

    rows = db.query(ScenarioGame).filter(ScenarioGame.category_id == category.id).all()

    games_out = []
    for sg in rows:
        progress = (
            db.query(UserGameProgress)
            .filter(UserGameProgress.user_id == current_user.id, UserGameProgress.scenario_game_id == sg.id)
            .first()
        )
        games_out.append(
            ScenarioGameOut(
                scenario_game_id=sg.id,
                game_code=sg.game.code,
                title=sg.title,
                description=sg.description,
                mechanic=sg.game.mechanic,
                current_level=progress.current_level if progress else 1,
                best_score=progress.best_score if progress else 0,
                times_played=progress.times_played if progress else 0,
            )
        )

    return ScenarioGamesResponse(scenario=scenario_code, games=games_out)


@router.post("/score", response_model=ScoreResponse)
async def submit_score(
    payload: ScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scenario_game = db.get(ScenarioGame, payload.scenario_game_id)
    if scenario_game is None:
        raise HTTPException(status_code=404, detail={"error": "Unknown scenario_game_id.", "code": "BAD_REQUEST"})

    try:
        assessment_raw = await generate_structured_json(
            system_prompt=BASE_SYSTEM_PROMPT,
            user_prompt=build_status_prompt(
                payload.profile, scenario_game.category.code, payload.score, payload.max_level, payload.chopped, payload.missed
            ),
            schema_name="mindgym_status",
            schema=STATUS_JSON_SCHEMA,
            result_key="assessment",
            model=payload.model,
            timeout_seconds=settings.status_timeout_seconds,
        )
        result = assessment_raw[0]
    except GroqCallError as err:
        logger.warning("Status generation failed, using deterministic fallback: %s (%s)", err.message, err.code)
        result = fallback_status(payload.score, payload.max_level, payload.chopped, payload.missed)

    db.add(
        GameSession(
            user_id=current_user.id,
            scenario_game_id=scenario_game.id,
            starting_level=payload.starting_level,
            ending_level=payload.max_level,
            was_restart=payload.was_restart,
            score=payload.score,
            chopped=payload.chopped,
            missed=payload.missed,
            mental_status=result["status"],
            summary=result["summary"],
            tip=result["tip"],
        )
    )

    progress = (
        db.query(UserGameProgress)
        .filter(UserGameProgress.user_id == current_user.id, UserGameProgress.scenario_game_id == scenario_game.id)
        .first()
    )
    if progress is None:
        progress = UserGameProgress(
            user_id=current_user.id,
            scenario_game_id=scenario_game.id,
            current_level=payload.max_level,
            best_score=payload.score,
            times_played=1,
            last_played_at=datetime.utcnow(),
        )
        db.add(progress)
    else:
        # Progress only ever goes up - a restart lets you REPLAY from level 1,
        # it doesn't erase what you'd already unlocked.
        progress.current_level = max(progress.current_level, payload.max_level)
        progress.best_score = max(progress.best_score, payload.score)
        progress.times_played += 1
        progress.last_played_at = datetime.utcnow()

    db.flush()

    return ScoreResponse(
        mental_status=result["status"],
        summary=result["summary"],
        tip=result["tip"],
        score=payload.score,
        starting_level=payload.starting_level,
        ending_level=payload.max_level,
        new_current_level=progress.current_level,
    )
