# Mental Gym

**AI-powered emotional intelligence and interactive scenario simulation platform.**

Have a real, spoken conversation with an AI character (an angry customer, an anxious
student, a hurt coworker, a sad friend). You talk into your microphone, the app
transcribes your speech, a local LLM evaluates your response for empathy, relevance,
and de-escalation, the character's emotional state updates accordingly, and the
character responds — out loud — in character. After a few exchanges you get a full
emotional-intelligence assessment.

---

> **Just want to see it working right now with zero installs?** Run
> `cd quick-demo && python3 server.py`, then open http://127.0.0.1:8000.
> That's a stripped-down, dependency-free proof of concept of one scenario -
> see `quick-demo/README.md` for details. Everything below is for the real
> full application.

## Table of contents

- [Project overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installing Node.js](#installing-nodejs)
- [Installing Python](#installing-python)
- [Installing Ollama](#installing-ollama)
- [Downloading a model](#downloading-a-model)
- [Backend setup](#backend-setup)
- [Frontend setup](#frontend-setup)
- [Running the application](#running-the-application)
- [Running in Demo Mode](#running-in-demo-mode)
- [Running in Real AI Mode](#running-in-real-ai-mode)
- [Testing the simulation](#testing-the-simulation)
- [Automated tests](#automated-tests)
- [Troubleshooting](#troubleshooting)
- [Project structure](#project-structure)
- [Future enhancements](#future-enhancements)

---

## Project overview

Mental Gym is a final-year academic project: an interactive, browser-based emotional
intelligence trainer. Instead of watching a pre-recorded video, the user has a dynamic,
voice-driven conversation with an AI character whose emotional state changes in
real time based on the quality of the user's responses.

## Features

- Full voice conversation loop: TTS question -> user speaks -> STT transcription ->
  user reviews/edits -> submit -> LLM analysis -> emotional state update -> spoken
  AI response -> next question
- Local, free/open-source LLM via **Ollama** (model configurable via env var), with
  a **Demo Mode** rule-based fallback so the app always runs even without Ollama
- Response relevance detection (off-topic answers are flagged, not silently accepted)
- A live emotion engine (anger / frustration / trust / calmness) driving an animated
  SVG avatar with idle / speaking / emotional expressions
- Structured, Pydantic-validated LLM output (never free-form parsing of prose)
- Final evaluation: empathy, communication, active listening, emotional awareness,
  and conflict-resolution scores, plus strengths/weaknesses/feedback and an
  emotion-journey chart, all derived from real stored simulation data
- 4 data-driven scenarios on one shared simulation engine (Angry Customer, Workplace
  Conflict, Anxious Student, Sad Friend)
- Graceful error handling everywhere (mic permission denied, browser without speech
  support, backend down, Ollama down, invalid LLM JSON, empty responses, etc.)

## Architecture

```
User
 -> Next.js frontend (React, TypeScript, Tailwind)
     -> Browser microphone + Web Speech API (speech-to-text)
     -> FastAPI backend (REST API)
         -> Simulation engine (session/state management)
         -> Emotion engine (anger/frustration/trust/calmness)
         -> LLM service -> Ollama (local LLM) OR Demo fallback
         -> Response evaluation (empathy/communication/listening/de-escalation)
         -> SQLite database (scenarios, sessions, messages, emotions, evaluations)
     -> AI character response (text)
     -> Browser SpeechSynthesis API (text-to-speech)
     -> Animated SVG avatar
 -> User (repeat until simulation ends -> final evaluation)
```

The frontend never talks to Ollama directly and contains no AI logic; it only
calls the FastAPI backend over REST. This keeps the AI stack swappable (Ollama
today, a hosted API or Whisper/Piper later) without touching the UI.

## Technology stack

| Layer     | Technology                                   |
|-----------|-----------------------------------------------|
| Frontend  | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend   | Python 3.11+, FastAPI                          |
| Database  | SQLite via SQLAlchemy (Postgres-ready)         |
| LLM       | Ollama (local, free, open-source)              |
| STT       | Browser Web Speech API                         |
| TTS       | Browser SpeechSynthesis API                    |
| Avatar    | Hand-built animated SVG (no paid avatar service)|

## Prerequisites

- Node.js 18.18 or newer
- Python 3.11 or newer
- (Optional, for real AI mode) Ollama, with at least ~4GB free RAM for a small model

## Installing Node.js

Download the LTS installer from https://nodejs.org and follow the prompts, or via a
package manager:

```bash
# macOS (Homebrew)
brew install node

# Windows (winget)
winget install OpenJS.NodeJS.LTS

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify: `node -v` and `npm -v`.

## Installing Python

Download from https://python.org/downloads or:

```bash
# macOS
brew install python@3.12

# Ubuntu/Debian
sudo apt-get install -y python3 python3-venv python3-pip
```

Verify: `python3 --version`.

## Installing Ollama

Real AI mode needs Ollama running locally. Demo Mode does **not** need this step -
skip to [Backend setup](#backend-setup) if you just want to see the app work first.

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Download the installer from https://ollama.com/download
```

Start the Ollama server (it usually starts automatically after install; if not):

```bash
ollama serve
```

## Downloading a model

Pick a lightweight model that runs comfortably without a dedicated GPU:

```bash
ollama pull qwen2.5:3b
# or: ollama pull llama3.2:3b
# or: ollama pull gemma2:2b
```

Whatever you pull, set the same name in `backend/.env` as `LLM_MODEL` (see below).
The model name is never hard-coded anywhere else in the app.

## Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# edit .env if you want a different model / provider
```

## Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# edit .env.local if your backend runs somewhere other than localhost:8000
```

## Running the application

Open two terminals.

**Terminal 1 - backend:**
```bash
cd backend
source venv/bin/activate       # Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```
The first run creates and seeds `mental_gym.db` automatically. Visit
http://localhost:8000/api/health to confirm it's up.

**Terminal 2 - frontend:**
```bash
cd frontend
npm run dev
```
Open http://localhost:3000 in Chrome or Edge (best Web Speech API support).

## Running in Demo Mode

Demo Mode needs no Ollama and no internet connection at all - useful for a
guaranteed-to-work presentation.

In `backend/.env`, set:
```
LLM_PROVIDER=demo
```
Restart the backend. The dashboard will show "Demo mode" and the simulation will
use the built-in rule-based conversation logic (keyword-based empathy detection,
scripted but emotion-reactive character replies).

If `LLM_PROVIDER=ollama` is set but Ollama is unreachable or returns invalid JSON,
the backend **automatically falls back to demo logic for that turn** - the app
never crashes because Ollama isn't running.

## Running in Real AI Mode

1. Make sure `ollama serve` is running and you've pulled a model (see above).
2. In `backend/.env`:
   ```
   LLM_PROVIDER=ollama
   LLM_MODEL=qwen2.5:3b
   OLLAMA_BASE_URL=http://localhost:11434
   ```
3. Restart the backend. The dashboard should show "AI mode" with your model name.

## Testing the simulation

The full acceptance test (from the original project brief):

1. Start the backend and frontend (and Ollama, or set Demo Mode).
2. Open http://localhost:3000.
3. Select "Angry Customer" and click "Start simulation".
4. You should see the avatar and hear the opening line spoken aloud.
5. Click the microphone button and speak a response, e.g. *"I understand your
   frustration, let me look into your order right away."*
6. Watch your words appear as transcribed text; edit if needed.
7. Click "Submit response".
8. The character's emotion (anger/trust/calmness) should visibly shift, the
   character should reply in character (spoken aloud), and a new question appears.
9. Try one deliberately irrelevant answer (e.g. *"I like cricket"*) - you should
   see a relevance warning rather than the conversation silently continuing.
10. After the configured number of exchanges, you'll be redirected to the results
    page showing overall + category scores, strengths/weaknesses, AI feedback, the
    emotion-journey chart, and the full transcript.

## Automated tests

```bash
cd backend
source venv/bin/activate
pytest
```
Tests force `LLM_PROVIDER=demo` so they never depend on Ollama being installed.

## Troubleshooting

| Problem | Fix |
|---|---|
| Dashboard says "Not reachable" | Make sure `uvicorn` is running on port 8000 and `NEXT_PUBLIC_API_URL` in `frontend/.env.local` matches. |
| No microphone button / "Microphone unavailable" | Use Chrome or Edge - Safari/Firefox have limited/no Web Speech API support. Check the browser granted microphone permission. |
| Avatar doesn't speak | Some browsers require a user gesture before allowing `speechSynthesis` - click anywhere on the page once, then retry. Check the mute toggle isn't on. |
| Ollama times out / always falls back to demo | Check `ollama serve` is running, the model in `.env` matches `ollama list`, and increase `LLM_TIMEOUT_SECONDS` if your machine is slow. |
| `pip install` fails | Make sure you're using Python 3.11+ and have activated the virtual environment. |
| CORS errors in the browser console | Confirm `FRONTEND_ORIGIN` in `backend/.env` matches the URL you're opening the frontend from. |

## Project structure

```
mental-gym/
├── frontend/
│   ├── app/                 # Next.js App Router pages (dashboard, simulation, results)
│   ├── components/          # Avatar, MicrophoneButton, EmotionJourneyChart
│   ├── hooks/                # useSpeechRecognition, useSpeechSynthesis
│   ├── lib/                  # typed API client
│   └── types/                 # shared TypeScript types (mirrors backend schemas)
├── backend/
│   ├── app/
│   │   ├── api/               # route handlers
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic request/response + LLM output schema
│   │   ├── services/           # llm_service, emotion_service, evaluation_service,
│   │   │                          simulation_service, scenario_service
│   │   ├── tests/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── seed_data.py
│   ├── requirements.txt
│   └── .env.example
├── docker-compose.yml        # optional
└── README.md
```

## Future enhancements

- Swap Web Speech API for Whisper/Faster-Whisper for more accurate, offline STT
- Swap browser TTS for an open-source neural voice (e.g. Piper) for more natural speech
- Add more scenarios and character archetypes
- Migrate SQLite to PostgreSQL for multi-user deployments
- Add authentication and per-user progress tracking/history dashboard
- Richer avatar (Lottie/Rive/Three.js) with lip-sync
