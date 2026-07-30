"""
Final evaluation service for the simulation feature.

Aggregates all per-turn scores stored on SimUserResponse rows (never fakes
numbers - always derived from what was actually stored during the
simulation) into a single SimEvaluationResult.
"""
from statistics import mean

from app.sim_models import SimUserResponse, SimEmotionState


def _avg(values: list[int]) -> int:
    return round(mean(values)) if values else 0


def build_evaluation(responses: list[SimUserResponse], emotion_states: list[SimEmotionState]) -> dict:
    empathy = _avg([r.empathy_score for r in responses])
    communication = _avg([r.communication_score for r in responses])
    listening = _avg([r.active_listening_score for r in responses])
    deescalation = _avg([r.deescalation_score for r in responses])

    # emotional awareness: how well the user's tone tracked / responded to
    # the character calming down over the course of the conversation
    if len(emotion_states) >= 2:
        anger_drop = emotion_states[0].anger - emotion_states[-1].anger
        emotional_awareness = max(0, min(100, round(50 + anger_drop * 100)))
    else:
        emotional_awareness = 50

    conflict_resolution = deescalation * 10  # deescalation_score is 0-10 -> scale to 0-100
    empathy_100 = empathy * 10
    communication_100 = communication * 10
    listening_100 = listening * 10

    overall = round(mean([empathy_100, communication_100, listening_100,
                           emotional_awareness, conflict_resolution]))

    strengths = []
    weaknesses = []

    if empathy_100 >= 70:
        strengths.append("You consistently acknowledged the other person's emotions.")
    else:
        weaknesses.append("Try acknowledging the other person's feelings more explicitly before problem-solving.")

    if communication_100 >= 70:
        strengths.append("You communicated clearly and stayed respectful throughout.")
    else:
        weaknesses.append("Aim for clearer, more direct communication of what you can actually do.")

    if listening_100 >= 70:
        strengths.append("You appeared to genuinely listen and respond to what was actually said.")
    else:
        weaknesses.append("Make sure each response directly addresses the specific question or concern raised.")

    if conflict_resolution >= 70:
        strengths.append("You helped de-escalate the situation effectively.")
    else:
        weaknesses.append("Offer more concrete next steps or solutions to help de-escalate tension.")

    irrelevant_count = sum(1 for r in responses if not r.is_relevant)
    if irrelevant_count > 0:
        weaknesses.append(f"{irrelevant_count} of your responses did not directly address the question asked.")

    if not strengths:
        strengths.append("You completed the full simulation and engaged with a difficult conversation.")
    if not weaknesses:
        weaknesses.append("Continue practicing - try an even harder scenario next.")

    feedback = (
        f"Overall you scored {overall}/100. "
        f"Your strongest area was "
        f"{'empathy' if empathy_100 == max(empathy_100, communication_100, listening_100, conflict_resolution) else 'communication'}. "
        "Focus next on directly acknowledging emotions before moving to solutions, and always give a concrete next step."
    )

    return {
        "empathy_score": empathy_100,
        "communication_score": communication_100,
        "active_listening_score": listening_100,
        "emotional_awareness_score": emotional_awareness,
        "conflict_resolution_score": conflict_resolution,
        "overall_score": overall,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "feedback": feedback,
    }
