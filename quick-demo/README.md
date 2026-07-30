# Mental Gym - Quick Demo (zero install)

This folder is a **stripped-down, dependency-free proof of concept** of the Angry
Customer scenario - useful if you want to see the app working in under 10 seconds
without installing Node.js, Python packages, or Ollama.

It is **not** the real application. It's a stand-in that uses:
- Python's built-in `http.server` instead of FastAPI (no `pip install` needed)
- Plain HTML/JS instead of Next.js/React (no `npm install` needed)
- The same rule-based "demo mode" emotion/relevance logic as the real backend's
  fallback path, hard-coded to just the Angry Customer scenario

The real, full application (FastAPI + Next.js + SQLite + Ollama + browser
speech-to-text/text-to-speech + all 4 scenarios) is in `../backend` and
`../frontend` - see the root `README.md` for that setup.

## Run it

Requires only Python 3 (already on most machines, no extra packages):

```bash
cd quick-demo
python3 server.py
```

Then open **http://127.0.0.1:8000** in your browser.

Click "Start simulation", type a response (there's no real microphone/speech
here - just type into the box and click Submit), and watch the character's
emotion and score update in real time. Try an empathetic response and then a
deliberately irrelevant one (e.g. "I like cricket") to see the relevance
detector in action.

Press Ctrl+C in the terminal to stop the server.
