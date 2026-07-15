# Quiet Hours API

A small FastAPI backend that generates reflection topics and per-topic
questions by calling Groq — keeping your Groq API key on the server instead
of in the browser.

## File layout

```
groq_backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, error handler
│   ├── config.py            # settings (reads .env)
│   ├── schemas.py           # request/response Pydantic models
│   ├── prompts.py           # prompt text + JSON Schemas for structured outputs
│   ├── groq_client.py       # Groq SDK wrapper: calls, retries, JSON parsing, typed errors
│   └── routers/
│       └── scenarios.py     # POST /api/topics, POST /api/questions
├── requirements.txt
├── .env.example
└── README.md
```

## Setup

```bash
cd groq_backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env and set GROQ_API_KEY to your real key
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000`. Interactive docs (Swagger UI) are
automatically available at `http://localhost:8000/docs`.

## Endpoints

### `GET /health`
Liveness check. Returns `{"status": "ok"}` — does not call Groq.

### `POST /api/topics`
Generates 8 reflection topics tailored to a profile.

Request body:
```json
{
  "profile": {
    "name": "Jordan",
    "age": 25,
    "mood": "Anxious",
    "sleepHours": 6,
    "stressLevel": 7,
    "support": "Some people I trust",
    "goals": "Better sleep schedule"
  },
  "model": "openai/gpt-oss-120b"
}
```
`model` is optional — falls back to `DEFAULT_MODEL` from `.env` if omitted.

Response body:
```json
{
  "topics": [
    { "id": 1, "topic": "Sleep", "description": "..." },
    { "id": 2, "topic": "Work", "description": "..." }
  ]
}
```

### `POST /api/questions`
Generates 10 questions for one chosen topic.

Request body:
```json
{
  "profile": { "...": "same shape as above" },
  "topic": "Sleep",
  "model": "openai/gpt-oss-120b"
}
```

Response body:
```json
{
  "questions": [
    {
      "id": 1,
      "narrative": "You're lying awake at 1am scrolling your phone...",
      "difficulty": 3,
      "options": [
        { "id": "A", "text": "Put the phone away and journal instead.", "strategy": "Reflective" },
        { "id": "B", "text": "Text a friend even though it's late.", "strategy": "Connective" },
        { "id": "C", "text": "Keep scrolling until you feel tired.", "strategy": "Avoidant" }
      ]
    }
  ]
}
```

## Error handling

Every failure — bad key, rate limit, timeout, unreachable Groq, malformed
model output, empty response — is caught and returned as clean JSON instead
of a bare 500:

```json
{ "error": "Groq rate limit reached. Try again shortly.", "code": "RATE_LIMIT" }
```

| `code`            | HTTP status | Meaning                                                      |
|--------------------|:-----------:|---------------------------------------------------------------|
| `AUTH_ERROR`       | 500         | The server's own `GROQ_API_KEY` was rejected by Groq          |
| `RATE_LIMIT`       | 429         | Groq rate limit hit                                            |
| `BAD_REQUEST`      | 502         | Groq rejected the request (e.g. unsupported/decommissioned model) |
| `TIMEOUT`          | 504         | Groq didn't respond within the configured timeout             |
| `NETWORK_ERROR`    | 502         | Couldn't reach Groq at all                                     |
| `PARSE_ERROR`      | 502         | Model's output wasn't valid JSON, even after repair attempts   |
| `EMPTY_RESPONSE`   | 502         | Model returned no content, or no topics/questions were found  |
| `API_ERROR`        | 502         | Any other non-2xx response from Groq                           |
| `INTERNAL_ERROR`   | 500         | Unexpected bug in this service (caught by the global handler) |

All errors are also logged server-side with full detail via the standard
`logging` module, so `AUTH_ERROR` responses (which intentionally hide detail
from the client since it's a server misconfiguration, not the caller's
fault) can still be debugged from the server logs.

## Notes on models

- `openai/gpt-oss-120b` and `openai/gpt-oss-20b` get Groq's **strict JSON
  Schema structured outputs** — the response is guaranteed to match the
  schema, which is the most reliable option.
- Other models (e.g. `llama-3.3-70b-versatile`, `qwen/qwen3-32b`) fall back
  to JSON Object Mode, which is looser; `groq_client.py` includes a
  best-effort repair pass (strips markdown fences, fixes a common
  double-brace templating artifact, extracts the outer `{...}` block) as a
  safety net.
- Reasoning models (gpt-oss, Qwen, DeepSeek) automatically get
  `reasoning_format: "hidden"` set — without it, the model's chain-of-thought
  text can leak into the JSON content and break parsing.

## Connecting the existing frontend

The `quiet-hours.html` file currently calls Groq directly from the browser
with a client-supplied API key. To use this backend instead:

1. Remove the "Groq API settings" (API key + remember-key) section from the form.
2. Point the two fetch calls at `http://localhost:8000/api/topics` and
   `http://localhost:8000/api/questions` instead of
   `https://api.groq.com/openai/v1/chat/completions`.
3. Send `{ profile, model }` / `{ profile, topic, model }` as the request
   body (matching the shapes above) instead of building the Groq chat
   payload client-side.

Happy to make that edit for you — just ask.
