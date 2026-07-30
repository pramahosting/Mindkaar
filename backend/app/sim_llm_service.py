"""
LLM service for the "Run Simulation" feature.

Responsible for turning (scenario + character + conversation history +
current question + user response) into a structured SimLLMAnalysis object.

Uses Groq (the same provider as the rest of MindGym) when GROQ_API_KEY is
configured, with an automatic, deterministic rule-based fallback ("demo
mode") if Groq is unreachable, rate-limited, or returns invalid JSON - the
simulation never crashes or gets stuck because of an LLM/network problem.
"""
import json
import logging
import re

from groq import (
    AsyncGroq,
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    RateLimitError,
)

from app.config import get_settings
from app.sim_schemas import SimLLMAnalysis

logger = logging.getLogger("mindgym.sim_llm_service")
settings = get_settings()
_client = AsyncGroq(api_key=settings.groq_api_key or "missing-key")

POSITIVE_WORDS = {
    "understand", "sorry", "apologize", "apologise", "help", "listen",
    "appreciate", "frustrat", "hear you", "my fault", "resolve", "fix",
    "care", "acknowledge", "valid", "makes sense", "solution", "support",
}
NEGATIVE_WORDS = {
    "not my problem", "calm down", "whatever", "not my fault", "don't care",
    "your problem", "nothing i can do", "too bad", "deal with it",
}


def _build_system_prompt(scenario: dict, character: dict) -> str:
    return f"""You are simulating an emotional-intelligence training exercise called Mind Gym.

You play the role of a character in a scripted scenario. You must analyze the human
user's latest response AND reply in character.

CHARACTER
name: {character['name']}
role: {character['role']}
personality: {character['personality']}

SCENARIO
title: {scenario['title']}
context: {scenario['context']}
objective for the user (a customer-service-like rep, friend, or coworker): {scenario['objective']}

Respond ONLY with a single JSON object, no markdown fences, no extra text,
matching EXACTLY this schema:

{{
  "is_relevant": boolean,
  "relevance_reason": string,
  "detected_user_emotion": string,
  "empathy_score": integer 0-10,
  "communication_score": integer 0-10,
  "active_listening_score": integer 0-10,
  "deescalation_score": integer 0-10,
  "character_emotion": {{"primary": string, "intensity": float 0-1, "trust": float 0-1}},
  "character_response": string (what your character says next, in character, 1-3 sentences),
  "next_question": string (a natural follow-up question/prompt from your character continuing the conversation),
  "should_continue": boolean
}}

Rules:
- If the user's response does not address the current question at all, set is_relevant to false,
  keep character_response short and have the character ask the user to actually respond to what
  was asked, and keep should_continue true.
- Adjust character_emotion realistically based on how empathetic/effective the response was.
- Never break character in character_response.
"""


def _build_user_prompt(history: list[dict], current_question: str, user_response: str) -> str:
    convo = "\n".join(f"{m['sender'].upper()}: {m['message']}" for m in history[-8:])
    return f"""Conversation so far:
{convo}

Current question the character just asked: "{current_question}"
User's response: "{user_response}"

Return only the JSON object described in the system prompt.
"""


def _extract_json(text: str) -> dict | None:
    text = text.strip()
    text = re.sub(r"^```(json)?|```$", "", text, flags=re.MULTILINE).strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            return None
    return None


async def _call_groq(system_prompt: str, user_prompt: str) -> dict | None:
    if not settings.groq_api_key:
        return None
    try:
        completion = await _client.with_options(timeout=settings.simulation_timeout_seconds).chat.completions.create(
            model=settings.default_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.8,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )
        if not completion.choices:
            return None
        content = completion.choices[0].message.content
        return _extract_json(content) if content else None
    except (AuthenticationError, RateLimitError, BadRequestError,
            APITimeoutError, APIConnectionError, APIStatusError) as exc:
        logger.warning("Groq call failed during simulation turn, falling back to demo mode: %s", exc)
        return None
    except Exception as exc:  # never let a malformed LLM turn crash the simulation
        logger.warning("Unexpected error calling Groq during simulation turn: %s", exc)
        return None


def _demo_analyze(scenario: dict, character: dict, current_emotion: dict,
                   current_question: str, user_response: str, question_index: int,
                   total_questions: int) -> SimLLMAnalysis:
    """Rule-based fallback used when Groq is unavailable/unconfigured/invalid.
    Deliberately simple so the demo always works offline."""
    text = user_response.lower().strip()

    is_relevant = len(text.split()) >= 3
    relevance_reason = (
        "The response engages with the situation."
        if is_relevant else
        "The response is too short or does not appear to address the question."
    )

    pos_hits = sum(1 for w in POSITIVE_WORDS if w in text)
    neg_hits = sum(1 for w in NEGATIVE_WORDS if w in text)
    quality = pos_hits - neg_hits

    if not is_relevant:
        empathy, comm, listening, deescalation = 2, 2, 2, 2
        detected_emotion = "unclear"
    elif quality > 0:
        empathy = min(10, 6 + pos_hits)
        comm = min(10, 6 + pos_hits)
        listening = min(10, 6 + pos_hits)
        deescalation = min(10, 6 + pos_hits)
        detected_emotion = "empathetic"
    elif quality < 0:
        empathy, comm, listening, deescalation = 2, 3, 3, 2
        detected_emotion = "dismissive"
    else:
        empathy, comm, listening, deescalation = 5, 5, 5, 5
        detected_emotion = "neutral"

    anger = current_emotion.get("anger", 0.5)
    frustration = current_emotion.get("frustration", 0.5)
    trust = current_emotion.get("trust", 0.5)
    calmness = current_emotion.get("calmness", 0.5)

    if not is_relevant:
        delta = 0.03
    else:
        delta = -0.12 if quality > 0 else (0.1 if quality < 0 else 0.0)

    anger = max(0.0, min(1.0, anger + delta))
    frustration = max(0.0, min(1.0, frustration + delta * 0.9))
    trust = max(0.0, min(1.0, trust - delta * 1.1))
    calmness = max(0.0, min(1.0, calmness - delta))

    if anger > 0.7:
        primary = "anger"
    elif frustration > 0.55:
        primary = "frustration"
    elif calmness > 0.6:
        primary = "calm"
    else:
        primary = "neutral"

    responses_good = [
        "...okay. I appreciate you actually listening to me for once.",
        "That helps a little. I just want this sorted out properly.",
        "Alright. I'm still not thrilled, but thank you for hearing me out.",
    ]
    responses_bad = [
        "Wow. That's really not the answer I was hoping for.",
        "So you're not even going to try to help me?",
        "That's exactly the kind of response that got us here in the first place.",
    ]
    responses_neutral = [
        "Okay... I guess we'll see.",
        "Right. So what happens now?",
    ]
    responses_irrelevant = [
        "...I don't think that answers what I asked. Can you address my actual concern?",
    ]

    if not is_relevant:
        character_response = responses_irrelevant[0]
    elif quality > 0:
        character_response = responses_good[question_index % len(responses_good)]
    elif quality < 0:
        character_response = responses_bad[question_index % len(responses_bad)]
    else:
        character_response = responses_neutral[question_index % len(responses_neutral)]

    follow_up_questions = [
        "What would you do next to resolve this?",
        "How can you make sure this doesn't happen again?",
        "What can you offer me right now?",
        "Why should I trust that this will actually get fixed?",
        "Is there anything else you can do to make this right?",
    ]
    should_continue = question_index + 1 < total_questions
    next_question = follow_up_questions[question_index % len(follow_up_questions)] if should_continue else ""

    return SimLLMAnalysis(
        is_relevant=is_relevant,
        relevance_reason=relevance_reason,
        detected_user_emotion=detected_emotion,
        empathy_score=empathy,
        communication_score=comm,
        active_listening_score=listening,
        deescalation_score=deescalation,
        character_emotion={"primary": primary, "intensity": max(anger, frustration, calmness), "trust": trust,
                            "anger": anger, "frustration": frustration, "calmness": calmness},
        character_response=character_response,
        next_question=next_question,
        should_continue=should_continue,
    )


async def analyze_and_respond(
    scenario: dict,
    character: dict,
    history: list[dict],
    current_emotion: dict,
    current_question: str,
    user_response: str,
    question_index: int,
    total_questions: int,
) -> tuple[SimLLMAnalysis, str]:
    """Returns (analysis, mode_used) where mode_used is 'groq' or 'demo'."""

    if settings.groq_api_key:
        system_prompt = _build_system_prompt(scenario, character)
        user_prompt = _build_user_prompt(history, current_question, user_response)
        raw = await _call_groq(system_prompt, user_prompt)

        if raw is not None:
            try:
                analysis = SimLLMAnalysis(**raw)
                if question_index + 1 >= total_questions:
                    analysis.should_continue = False
                return analysis, "groq"
            except Exception:
                pass  # fall through to demo fallback below

    analysis = _demo_analyze(
        scenario, character, current_emotion, current_question, user_response,
        question_index, total_questions,
    )
    return analysis, "demo"
