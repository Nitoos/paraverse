# Paraverse — Design Document

_Oct 18, 2026 · Local-first hackathon build_

## Intent and Why

Paraverse lets enterprise change managers rehearse a UI rollout on a synthetic workforce before it reaches real employees. Gemini-powered persona agents operate a real web interface through a headless browser, narrate confusion while working, and produce a ranked friction report with an hours-lost estimate and fix suggestions. The calibration layer — tuned against seeded past rollouts with known outcomes — is what separates this from a toy: it makes the prediction trustworthy enough to act on.

We're building local-first (no GCP credentials yet) with a Gemini API key already in hand. The two non-negotiable demo pieces are the **swarm wall** (live agents navigating the UI with think-aloud captions) and the **calibration chart** (uncalibrated vs. calibrated accuracy on seeded rollouts).

## Goals

- Swarm of synthetic persona agents operates a real web UI via Playwright and Gemini Flash (vision)
- Swarm wall shows live agent screens, status, step count, and think-aloud captions
- Metrics engine produces completion rate, time-on-task, drop-off step, confusion clusters, hours lost per year
- Calibration module tunes against 6–8 seeded past rollouts, reports accuracy before/after, attaches confidence score
- Fix suggester proposes ranked changes for the worst step; re-simulation shows the delta
- Everything runs locally with no cloud charges

## Non-Goals

- GCP deployment (placeholder for after the hackathon, or once credentials are ready)
- Real employee data — all personas and demo content are synthetic
- Native mobile or desktop apps — web UIs only
- Multi-tenancy, SSO, or billing
- Production-grade security

## Anti-Goals (What Would Make This a Failure)

- Swarm agents that hallucinate UI elements and count invented actions as successes
- Calibration numbers that look tuned on the test set (must hold out 2 rollouts)
- A demo that only works if the network and quota behave perfectly — replay mode and a backup video are required
- A dashboard that obscures uncertainty — confidence badges and "least reliable for" notes must be visible

## Constraints

- **Local development first.** No GCP credentials yet; swap in Firestore/Cloud Storage/Cloud Run later.
- **Gemini API key in hand.** Free tier; rate-limited. Never enable billing.
- **Hackathon time pressure.** P0 items only until the core loop works end to end.
- **Zero-cost mandate.** All storage is local (SQLite + local filesystem). Gemini calls are rate-limited with a token-bucket queue.
- **Gemini/Gemma requirement.** Swarm agents use Gemini Flash (vision). Persona generator and calibration judge may use Gemma or Flash-Lite if available at no cost.

## Architecture (Local)

```
Browser (React dashboard)
        │
        ▼
FastAPI server  ──► SQLite (studies, runs, steps, calibration, fixes)
        │               │
        ▼               ▼
Swarm runner        Local filesystem (screenshots, traces)
  │
  ├── Persona generator (Gemini Flash text)
  ├── Agent loop (Playwright + Gemini Flash vision, per agent)
  └── Rate-limit queue (token bucket, backoff, per-step checkpoint)
        │
        ▼
Analysis engine (FastAPI)
  ├── Metrics engine
  ├── Calibration module
  └── Fix suggester (Gemini)
```

All components run in a single Python process for local dev. The swarm runner is async, with agents running concurrently up to the rate-limit budget.

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React (Vite) | Fast to scaffold, hot reload |
| API | Python FastAPI | Async, clean SSE for live swarm wall |
| Browser automation | Playwright + Chromium | Real UI interaction, headless |
| Models | Gemini Flash (vision) for agents; Flash or Flash-Lite (text) for persona gen, analysis, fix suggester | Meets hackathon requirement; free tier |
| Storage | SQLite (records) + `./data/screenshots/` (images) | Zero-config local dev; swap to Firestore/GCS later |
| Rate limiting | Token bucket + exponential backoff with jitter | Respects free-tier limits |

## Project Structure

```
paraverse/
├── backend/
│   ├── main.py                  # FastAPI app + routes
│   ├── models.py                # SQLite schema (SQLModel)
│   ├── persona_generator.py     # Gemini text → persona JSON
│   ├── swarm_runner.py          # Async agent orchestration
│   ├── agent_loop.py            # Per-agent: screenshot → Gemini → action → log
│   ├── metrics.py               # Completion rate, time-on-task, drop-off, etc.
│   ├── calibration.py           # Seeded rollouts, tuning, accuracy reporting
│   ├── fix_suggester.py         # Gemini → ranked fixes
│   ├── rate_limiter.py          # Token bucket + backoff
│   └── config.py                # Model IDs, paths, constants
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Setup.tsx        # URL/demo picker, segments, variants
│   │   │   ├── SwarmWall.tsx    # Live agent grid (SSE)
│   │   │   ├── Report.tsx       # Funnel, heatmap, quotes, hours lost
│   │   │   └── FixLoop.tsx      # Ranked fixes, re-simulation delta
│   │   └── components/
│   │       ├── AgentCard.tsx    # Single agent tile: screenshot, status, caption
│   │       ├── Funnel.tsx
│   │       ├── CalibrationChart.tsx
│   │       └── HoursLost.tsx
├── demo_app/
│   ├── baseline/index.html      # Expense form v1 (working baseline)
│   ├── flawed/index.html        # Expense form v2 (planted usability flaws)
│   └── fixed/index.html         # Expense form v3 (flaws corrected)
├── data/
│   ├── paraverse.db             # SQLite database
│   └── screenshots/             # Agent screenshots keyed by run_id/step_index
├── calibration_seeds/
│   └── rollouts.json            # 6–8 seeded past rollouts with known outcomes
├── .env                         # GEMINI_API_KEY (never committed)
├── requirements.txt
└── README.md
```

## Demo Expense App (3 Versions)

A simple multi-step expense report submission form. The three versions are static HTML pages served by a local Python HTTP server on a separate port so agents browse to a real URL.

- **Baseline**: clear labels, logical step order, inline validation, no jargon
- **Flawed redesign**: "cost center" jargon without explanation, submit button below the fold on mobile viewport, required field not marked, error message hidden
- **Fixed**: flaws corrected — plain-language label, button visible, required field marked, error inline

The planted flaw for the demo is the "cost center" field on step 3. Frontline mobile personas should show the highest confusion and abandonment there.

## Persona Segments and Traits

Each persona is a JSON object with structured behavioral rules (not a story):

```json
{
  "id": "p_001",
  "segment": "frontline_mobile",
  "tenure_years": 0.5,
  "tech_literacy": 2,
  "language_fluency": 4,
  "device": "mobile_375px",
  "patience_budget_steps": 8,
  "patience_budget_seconds": 120,
  "accessibility_needs": [],
  "behavioral_rules": [
    "If a label uses an acronym you were not told, treat it as unclear.",
    "Prefer tapping the first visible button rather than reading all options.",
    "If you cannot complete a step in 3 attempts, give up."
  ]
}
```

Segments: new hire, power user, non-native speaker, frontline mobile, low-vision/screen-reader, occasional user. Default mix: 20 agents, configurable.

## Swarm Agent Loop

Per agent, per step:

1. Capture a 800×600 (desktop) or 375×667 (mobile) screenshot, downscaled to 60% quality
2. Extract a compact element list from the DOM: `[{id, tag, text, role, visible}]`
3. Prompt Gemini Flash (vision) with: persona traits + behavioral rules, task goal, last 3 steps, screenshot, element list
4. Validate the JSON response against the action schema
5. Execute the action via Playwright (click, type, scroll, wait, or give_up)
6. Log the step to SQLite and screenshot to disk
7. Check stop conditions: `goal_reached`, `patience_exhausted`, `error`, `step_cap` (12)
8. Stream the step event to the dashboard via SSE

**Action schema:**
```json
{
  "thought": "...",
  "confused": true,
  "confusion_reason": "jargon in label",
  "action": "click | type | scroll | wait | give_up | goal_reached",
  "target_id": "el_14",
  "value": null,
  "confidence": 0.4
}
```

Agents may only act on element IDs present in the supplied list. An invalid target ID is logged as an error, not a success.

## Rate Limiting

Token bucket: 10 requests/minute default (adjust to actual Gemini free-tier limits). Each agent step consumes one token. The queue blocks rather than drops. Exponential backoff with jitter on 429 responses. Per-step checkpointing: if the process dies mid-run, resuming skips completed steps.

## Metrics Engine

All metrics are derived from stored step logs — every number on the dashboard traces to individual agent actions.

| Metric | Definition |
|---|---|
| Completion rate | runs with outcome `completed` / all runs |
| Time-on-task | sum of persona-scaled human time costs per step (agent latency excluded) |
| Drop-off step | step index where most abandoned runs ended |
| Confusion rate | steps with `confused=true` / total steps |
| Extra minutes per task | variant mean time-on-task − baseline mean |
| Hours lost per year | N × F × Δm / 60 |
| Support tickets avoided | confusion+abandonment rate delta × N × F × 0.02 |
| Prediction confidence | calibration accuracy for matching task type, adjusted for sample size |

## Calibration Module

**Seeded rollouts (6–8):** Pairs of UI variants with known winners, sourced from public conversion-optimization case studies adapted to internal-tool contexts, plus hand-crafted pairs with planted flaws. Stored in `calibration_seeds/rollouts.json`.

**Procedure:**
1. Hold out 2 rollouts as a test set before any tuning
2. Run uncalibrated swarm on remaining rollouts; record predicted winner and direction
3. Tune persona mix weights (patience, literacy, language fluency) to maximize agreement on the tuning set
4. Re-run, evaluate on held-out rollouts
5. Report: uncalibrated accuracy, calibrated (tuning), calibrated (held-out)

**Reported measures:** winner accuracy, direction accuracy, rank correlation, run-to-run stability.

Results are labeled "seeded and illustrative." With 6–8 rollouts, results are directional, not statistical proof — the dashboard says so.

## Fix Suggester and Re-Simulation

After a run completes, Gemini (analysis model or Flash if quota is tight) receives: the worst step, its screenshots, and confusion quotes. It returns ranked fixes with expected impact. The user picks one fix (or edits the URL to a fixed variant), re-runs the swarm on the same segment mix, and the dashboard shows a before/after delta on drop-off rate at the flagged step.

## Data Model (SQLite)

Tables: `studies`, `variants`, `personas`, `runs`, `steps`, `calibration_runs`, `fixes`.

Key fields match the Firestore schema in the PRD exactly, so migration later is a rename-and-copy.

## UX Screens

1. **Setup** — URL or demo picker, task description, variant list, segment mix sliders, agent count, hours-lost inputs, Live/Recorded toggle
2. **Swarm wall** — grid of `AgentCard` tiles (screenshot thumbnail, status badge, step counter, think-aloud caption); progress bar; queue/quota indicator; updates via SSE
3. **Report** — funnel by variant, friction heatmap overlaid on screenshots, confusion clusters with verbatim quotes, hours lost, tickets avoided, segment filter, confidence badge
4. **Fix and re-test** — ranked fixes, apply to variant, re-run, before/after delta

## Build Order (Hackathon Priority)

1. Demo expense app (3 static HTML versions) + local server
2. SQLite schema + FastAPI skeleton with SSE endpoint
3. Persona generator (Gemini text)
4. Swarm agent loop + rate limiter + per-step checkpointing
5. Metrics engine
6. Seeded calibration rollouts data + calibration module
7. React dashboard: Setup → Swarm wall (SSE) → Report → Fix loop
8. Fix suggester + re-simulation endpoint
9. Calibration chart in dashboard
10. Polish: accessibility, confidence badge, replay mode

**Never cut:** calibration chart, hours-lost number, fix-and-re-test demo.

## Builder Calls (Decisions Made Here)

- **Persona-scaled time-on-task:** Base seconds by action type (click=5s, type=20s, scroll=3s, wait=2s) multiplied by a per-segment factor (new hire 1.5×, power user 0.7×, non-native speaker 1.8×, frontline mobile 1.3×, low-vision 2.0×, occasional 1.4×). Excludes actual Playwright/Gemini latency.
- **Fix suggester scope:** Manual URL-pointing only. Gemini suggests a fix in text; the user selects the pre-built fixed variant URL from a dropdown and re-runs. No auto-patching of HTML.
- **Recorded mode:** Streams stored SQLite step rows as SSE events into the same swarm wall UI. A completed run is saved to DB and can be replayed on demand with no additional Gemini calls.
- **Calibration tuning mechanism:** Post-hoc segment weighting. All calibration rollouts are run once. Tuning finds the segment weight vector that maximizes predicted-vs-known agreement on the tuning set, then applies those weights to new predictions. No re-running of agents during calibration. This is noted in the dashboard as "weighted ensemble, not re-run" to avoid misleading the reader.

## What's Left to the Builder

- Exact Gemini model IDs (verify in AI Studio; put in `config.py`)
- Actual free-tier RPM limit (check AI Studio console; set token-bucket rate)
- Exact HTML structure of the demo expense app (must be realistic enough that Playwright can interact with it)
- Number of seeded calibration rollouts to generate (6–8; builder chooses concrete scenarios)
- React component library (builder's choice: Tailwind, shadcn, or plain CSS)
- Port numbers for backend (8000), frontend (5173), demo app server (3001)
