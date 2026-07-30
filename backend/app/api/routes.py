from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models.models import Scenario, SimulationSession
from app.schemas import schemas
from app.services import scenario_service, simulation_service

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok", "llm_provider": settings.llm_provider, "llm_model": settings.llm_model}


@router.get("/scenarios", response_model=list[schemas.ScenarioOut])
def get_scenarios(db: Session = Depends(get_db)):
    return scenario_service.list_scenarios(db)


@router.get("/scenarios/{scenario_id}", response_model=schemas.ScenarioOut)
def get_scenario(scenario_id: str, db: Session = Depends(get_db)):
    scenario = scenario_service.get_scenario(db, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


def _emotion_out(session: SimulationSession) -> schemas.EmotionOut:
    if not session.emotion_states:
        return schemas.EmotionOut(primary_emotion="neutral", intensity=0.5, anger=0.5,
                                   frustration=0.5, trust=0.5, calmness=0.5)
    e = session.emotion_states[-1]
    return schemas.EmotionOut(primary_emotion=e.primary_emotion, intensity=e.intensity,
                               anger=e.anger, frustration=e.frustration,
                               trust=e.trust, calmness=e.calmness)


@router.post("/simulations/start", response_model=schemas.StartSimulationResponse)
def start_simulation(payload: schemas.StartSimulationRequest, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == payload.scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    session = simulation_service.start_session(db, scenario)

    return schemas.StartSimulationResponse(
        session_id=session.id,
        scenario=scenario,
        mode=session.mode,
        opening_line=scenario.opening_line,
        first_question=scenario.opening_line,
        emotion=_emotion_out(session),
        question_index=session.question_index,
        total_questions=scenario.total_questions,
    )


def _get_session_or_404(db: Session, session_id: str) -> SimulationSession:
    session = db.query(SimulationSession).filter(SimulationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Simulation session not found")
    return session


@router.get("/simulations/{session_id}", response_model=schemas.SessionStateResponse)
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = _get_session_or_404(db, session_id)
    return schemas.SessionStateResponse(
        session_id=session.id,
        scenario=session.scenario,
        status=session.status,
        mode=session.mode,
        current_question=session.current_question,
        question_index=session.question_index,
        total_questions=session.scenario.total_questions,
        emotion=_emotion_out(session),
        transcript=session.messages,
    )


@router.post("/simulations/{session_id}/respond", response_model=schemas.RespondResponse)
async def respond(session_id: str, payload: schemas.RespondRequest, db: Session = Depends(get_db)):
    session = _get_session_or_404(db, session_id)

    if session.status == "completed":
        raise HTTPException(status_code=400, detail="This simulation has already ended.")

    if not payload.user_response or not payload.user_response.strip():
        raise HTTPException(status_code=400, detail="Response cannot be empty.")

    analysis, new_emotion, should_continue, mode_used = await simulation_service.process_turn(
        db, session, payload.user_response.strip()
    )

    return schemas.RespondResponse(
        is_relevant=analysis.is_relevant,
        relevance_reason=analysis.relevance_reason,
        detected_user_emotion=analysis.detected_user_emotion,
        empathy_score=analysis.empathy_score,
        communication_score=analysis.communication_score,
        active_listening_score=analysis.active_listening_score,
        deescalation_score=analysis.deescalation_score,
        character_response=analysis.character_response,
        next_question=session.current_question if should_continue else None,
        emotion=schemas.EmotionOut(**new_emotion),
        should_continue=should_continue,
        question_index=session.question_index,
        total_questions=session.scenario.total_questions,
        mode=mode_used,
    )


@router.post("/simulations/{session_id}/complete")
def complete_simulation(session_id: str, db: Session = Depends(get_db)):
    session = _get_session_or_404(db, session_id)
    evaluation = simulation_service.complete_session(db, session)
    return {"status": "completed", "session_id": session.id, "overall_score": evaluation.overall_score}


@router.get("/simulations/{session_id}/results", response_model=schemas.SessionResultsResponse)
def get_results(session_id: str, db: Session = Depends(get_db)):
    session = _get_session_or_404(db, session_id)

    if not session.evaluation:
        simulation_service.complete_session(db, session)
        db.refresh(session)

    emotion_journey = [
        schemas.EmotionHistoryPoint(
            message_index=e.message_index,
            primary_emotion=e.primary_emotion,
            intensity=e.intensity,
            anger=e.anger,
            frustration=e.frustration,
            trust=e.trust,
            calmness=e.calmness,
        )
        for e in session.emotion_states
    ]

    return schemas.SessionResultsResponse(
        session_id=session.id,
        scenario_title=session.scenario.title,
        status=session.status,
        mode=session.mode,
        transcript=session.messages,
        emotion_journey=emotion_journey,
        evaluation=session.evaluation,
    )
