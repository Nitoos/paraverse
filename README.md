# Paraverse

Synthetic workforce UX simulation — Gemini-powered persona agents operate real web UIs via Playwright, predicting friction, drop-off, and hours-lost before any real employee sees the UI.

## Quick Start

### 1. Set your Gemini API key

```bash
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=<your key>
```

### 2. Start all three servers (3 terminals)

**Terminal 1 — Demo app (port 3001)**
```bash
python3 demo_app/serve.py
```

**Terminal 2 — Backend API (port 8000)**
```bash
.venv/bin/python -m uvicorn backend.main:app --reload --port 8000
```

**Terminal 3 — Frontend (port 5173)**
```bash
cd frontend && npm run dev
```

### 3. Open the UI

Navigate to **http://localhost:5173**

1. **Setup** — choose task goal, agent mix, and variant URLs
2. **Swarm Wall** — watch agents operate the UI live with screenshots
3. **Report** — completion funnel, hours-lost, fix loop, calibration chart

## Architecture

```
frontend (React + Vite, :5173)
    ↕ REST + SSE
backend (FastAPI, :8000)
    ├── persona_generator  — Gemini Flash: synthetic employee profiles
    ├── agent_loop         — Playwright + Gemini vision: step-by-step UI operation
    ├── swarm_runner       — asyncio parallel runs; SSE event stream
    ├── metrics            — completion funnel, hours-lost formula
    ├── fix_suggester      — Gemini: ranked UX fixes from confusion quotes
    └── calibration        — grid search over 4096 weight combos, holdout validation
demo_app (http.server, :3001)
    ├── baseline/  — clean 4-step expense form
    ├── flawed/    — same form with 3 hidden UX flaws
    └── fixed/     — flaws corrected
```

## Segments

| Segment | Multiplier | Device |
|---|---|---|
| new_hire | 1.5× | desktop |
| power_user | 0.7× | desktop |
| non_native | 1.8× | desktop |
| frontline_mobile | 1.3× | mobile 375px |
| low_vision | 2.0× | desktop |
| occasional | 1.4× | desktop |

## Key Design Decisions

- **SQLite** — local-first, no GCP credentials needed
- **Token bucket** — 10 RPM default, exponential backoff with jitter on 429
- **Replay mode** — zero Gemini calls; streams stored DB rows as SSE
- **Hallucination guard** — if Gemini returns an element ID not in the DOM, agent stops with `outcome=error`
- **Calibration** — 6 tuning rollouts, 2 held-out; grid search over 4^6 = 4096 weight combos

## Tests

```bash
PYTHONPATH=. .venv/bin/python -m pytest tests/ -v
```
