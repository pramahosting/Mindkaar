# Quiet Hours (React)

A React + Vite port of the Quiet Hours reflection app. Same visual design
and behavior as the original static HTML version, restructured into
components. Talks to the FastAPI backend (`groq_backend/`) for scenario
generation — no API key lives in this app.

## File layout

```
quiet-hours-react/
├── index.html                 — Vite entry HTML
├── package.json
├── vite.config.js
├── .gitignore
└── src/
    ├── main.jsx                — React root
    ├── App.jsx                 — top-level layout, wires state + components together
    ├── index.css                — full design system (ported 1:1 from the original)
    ├── api.js                   — fetch calls to the FastAPI backend, typed errors
    ├── utils.js                 — JSON parsing helpers, topic/difficulty formatting
    ├── hooks/
    │   └── useScenarios.js       — all topic/question state + fetch orchestration
    └── components/
        ├── ProfileForm.jsx       — Section 1: baseline form
        ├── ApiSettings.jsx       — collapsible backend URL + model picker
        ├── TopicList.jsx         — Section 2: topic list
        ├── TopicCard.jsx         — one topic card (with loading/error state tag)
        ├── DifficultyDots.jsx    — the dot-based difficulty indicator
        ├── QuestionPanel.jsx     — Section 3: empty/loading/error/ready states
        └── QuestionBlock.jsx     — one question's narrative + options
```

## Setup

```bash
cd quiet-hours-react
npm install
npm run dev
```

Opens at `http://localhost:5173`. By default the app talks to a FastAPI
backend at `http://localhost:8000` — start that first (see `groq_backend/`),
or change the Backend URL in the collapsed "API settings" section of the
form.

## Build

```bash
npm run build    # outputs to dist/
npm run preview  # serve the production build locally
```

## How it works

- **Section 1 (`ProfileForm`)** collects the baseline profile via an
  uncontrolled form (read with `FormData` on submit) plus the backend URL
  and model, which are controlled state lifted to `App`.
- **`useScenarios`** is the single source of truth for topics and their
  questions: it fetches the topic list on submit, fetches a topic's 10
  questions on first click (cached afterward, so re-clicking a topic never
  re-fetches), and tracks per-topic loading/error/timeout state
  independently — so one topic failing never affects the others or makes
  the list disappear.
- **`api.js`** wraps `fetch` with a timeout (`AbortController`), and turns
  every failure mode (network unreachable, timeout, non-2xx response,
  malformed JSON, empty result) into a distinct `Error` with a `.code`, so
  the UI always shows a specific, actionable message instead of a generic
  one.

## Notes

- No API key or model-provider secret lives in this app — that's entirely
  server-side in the FastAPI backend.
- The design system in `index.css` is ported unchanged from the original
  static build, so visually this should be pixel-identical.
