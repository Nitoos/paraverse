# Paraverse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first web platform where Gemini-powered synthetic persona agents operate a real expense-form UI via Playwright, producing a friction report, hours-lost estimate, calibration chart, and fix loop — all running at zero cost.

**Architecture:** A single FastAPI process serves the React dashboard, orchestrates the async swarm runner (Playwright + Gemini Flash vision), persists all state to SQLite and local screenshots, and streams live step events to the UI via SSE. A calibration module tunes post-hoc segment weights against 8 seeded rollouts (6 tuning, 2 held-out) and attaches a confidence score to every prediction.

**Tech Stack:** Python 3.11+, FastAPI, SQLModel (SQLite), Playwright (Chromium), google-generativeai, React 18 + Vite + TypeScript, Tailwind CSS, Recharts

**Spec:** `docs/superpowers/specs/2026-10-18-paraverse-design.md`

## Global Constraints

- Python ≥ 3.11, Node ≥ 20
- Backend port: 8000; Frontend port: 5173; Demo app server port: 3001
- Gemini Flash vision model for swarm agents (exact model ID in `config.py`); Flash or Flash-Lite text model for persona generator, analyst, fix suggester
- Token bucket: 10 requests/minute default, configurable via `GEMINI_RPM` env var
- Agent step cap: 12; patience budget enforced per persona (steps and seconds)
- Time-on-task formula: base seconds by action (click=5, type=20, scroll=3, wait=2) × segment multiplier (new_hire=1.5, power_user=0.7, non_native=1.8, frontline_mobile=1.3, low_vision=2.0, occasional=1.4)
- Agents may only act on element IDs in the supplied element list; invalid target → log error, do NOT execute
- Calibration: hold out rollouts index 6 and 7 (0-indexed); tune on 0–5; never mix sets
- `GEMINI_API_KEY` in `.env`, never committed; `.gitignore` covers `.env` and `data/`
- All screenshot paths stored relative to project root (e.g. `data/screenshots/run_id/step_003.jpg`)
- CORS: allow `http://localhost:5173` on all API routes

## Review Focus

These five failure modes the spec implies but no single task's tests exercise in isolation — each line gets its test added to the owning task:

1. **Hallucinated element ID** — Gemini returns a `target_id` not in the element list; must be logged as `error` outcome step, agent must stop, not execute the action. → Task 6.
2. **Patience budget exhaustion** — agent reaches `patience_budget_steps` before `goal_reached`; must produce outcome `abandoned`, terminal state, no further Gemini calls. → Task 6.
3. **Gemini 429 rate limit mid-swarm** — `ResourceExhausted` raised during an agent step; swarm must retry that step with backoff, not crash the run or the other concurrent agents. → Task 4.
4. **Recorded mode makes zero Gemini calls** — replaying a stored run must stream SSE from SQLite rows only; any Gemini call during replay is a bug. → Task 8.
5. **Calibration tuning set never touches held-out rollouts** — weight optimisation loop must only see rollout indices 0–5; indices 6–7 are evaluated after, never during, tuning. → Task 9.

---

## File Map

```
paraverse/
├── backend/
│   ├── config.py               # Task 2 — model IDs, ports, paths, rate-limit defaults
│   ├── models.py               # Task 2 — SQLModel table definitions
│   ├── database.py             # Task 2 — engine init, get_session
│   ├── rate_limiter.py         # Task 4 — TokenBucket, with_backoff decorator
│   ├── persona_generator.py    # Task 5 — generate_personas(study_id, mix) -> list[Persona]
│   ├── agent_loop.py           # Task 6 — run_agent(run_id, persona, variant_url, task_goal) -> str
│   ├── swarm_runner.py         # Task 7 — run_study(study_id) -> None; replay_study(study_id)
│   ├── metrics.py              # Task 8 — compute_metrics(study_id) -> StudyMetrics
│   ├── calibration.py          # Task 9 — run_calibration() -> CalibrationResult
│   ├── fix_suggester.py        # Task 10 — suggest_fixes(study_id) -> list[Fix]
│   └── main.py                 # Task 7 — FastAPI app, all routes, SSE endpoints
├── frontend/
│   ├── package.json            # Task 11
│   ├── vite.config.ts          # Task 11
│   ├── tailwind.config.js      # Task 11
│   ├── src/
│   │   ├── main.tsx            # Task 11
│   │   ├── App.tsx             # Task 11 — router: /, /swarm/:studyId, /report/:studyId, /fix/:studyId
│   │   ├── api/
│   │   │   └── client.ts       # Task 11 — typed fetch wrappers for all backend routes
│   │   ├── pages/
│   │   │   ├── Setup.tsx       # Task 11 — study creation form
│   │   │   ├── SwarmWall.tsx   # Task 12 — SSE consumer, agent grid
│   │   │   ├── Report.tsx      # Task 13 — funnel + heatmap + quotes + hours lost
│   │   │   └── FixLoop.tsx     # Task 14 — ranked fixes + re-run trigger + before/after delta
│   │   └── components/
│   │       ├── AgentCard.tsx   # Task 12 — single tile: screenshot, status, caption
│   │       ├── Funnel.tsx      # Task 13 — Recharts BarChart of completion by step
│   │       ├── HoursLost.tsx   # Task 13 — editable N, F inputs + computed H
│   │       └── CalibrationChart.tsx  # Task 14 — three-bar chart + disclaimer
├── demo_app/
│   ├── serve.py                # Task 1 — http.server on port 3001
│   ├── baseline/index.html     # Task 1 — clear 4-step expense form
│   ├── flawed/index.html       # Task 1 — "cost center" jargon, hidden error, buried button
│   └── fixed/index.html        # Task 1 — flawed variant with all three issues corrected
├── calibration_seeds/
│   └── rollouts.json           # Task 9 — 8 rollout records
├── tests/
│   ├── test_rate_limiter.py    # Task 4
│   ├── test_persona_generator.py  # Task 5
│   ├── test_agent_loop.py      # Task 6
│   ├── test_metrics.py         # Task 8
│   └── test_calibration.py    # Task 9
├── data/                       # gitignored; created at runtime
│   ├── paraverse.db
│   └── screenshots/
├── .env.example
├── .gitignore
└── requirements.txt
```

---

### Task 1: Project Scaffold + Demo Expense App

**Files:**
- Create: `requirements.txt`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `demo_app/serve.py`
- Create: `demo_app/baseline/index.html`
- Create: `demo_app/flawed/index.html`
- Create: `demo_app/fixed/index.html`
- Create: `data/.gitkeep`

**Interfaces:**
- Produces: Three browseable URLs at `http://localhost:3001/baseline/`, `/flawed/`, `/fixed/` — each a 4-step expense form that Playwright can interact with using stable `id` attributes on every interactive element.

- [ ] **Step 1: Create `requirements.txt`**

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlmodel==0.0.21
playwright==1.48.0
google-generativeai==0.8.3
python-dotenv==1.0.1
Pillow==11.0.0
pytest==8.3.3
pytest-asyncio==0.24.0
httpx==0.27.2
numpy==2.1.0
```

- [ ] **Step 2: Create `.env.example`**

```
GEMINI_API_KEY=your_key_here
GEMINI_RPM=10
GEMINI_AGENT_MODEL=gemini-1.5-flash-latest
GEMINI_TEXT_MODEL=gemini-1.5-flash-latest
```

- [ ] **Step 3: Create `.gitignore`**

```
.env
data/
__pycache__/
*.pyc
.pytest_cache/
node_modules/
dist/
```

- [ ] **Step 4: Write `demo_app/baseline/index.html`**

Four-step expense report form with these stable IDs:
- Step 1: `#expense-title` (text input), `#expense-date` (date), `#btn-next-1` (Next button)
- Step 2: `#expense-amount` (number), `#expense-currency` (select: USD/EUR/GBP), `#btn-next-2`
- Step 3: `#expense-category` (select with plain label "Category"), `#expense-description` (textarea), `#btn-next-3`
- Step 4: `#receipt-upload` (file), `#btn-submit` (Submit — visible without scrolling on 375px viewport)
- Inline validation: required fields show `*` label, error messages appear as `<span class="error">` siblings

- [ ] **Step 5: Write `demo_app/flawed/index.html`**

Same 4 steps, three planted flaws:
1. Step 3 label reads "Cost Center Code" with no explanation (jargon)
2. Step 4 Submit button only visible after scrolling on 375px viewport (300px margin-top)
3. Step 2 amount field has no `required` marker and its error message has `display:none` and is never shown

- [ ] **Step 6: Write `demo_app/fixed/index.html`**

Flawed variant with all three issues corrected:
1. Step 3 label reads "Department or Project Code (your team's billing code)"
2. Submit button at top of step 4, no scroll required
3. Amount field marked required (`*`), error shown inline

- [ ] **Step 7: Write `demo_app/serve.py`**

```python
import http.server, socketserver, os, sys

PORT = int(os.environ.get("DEMO_PORT", 3001))
os.chdir(os.path.dirname(__file__))
Handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Demo app at http://localhost:{PORT}")
    httpd.serve_forever()
```

- [ ] **Step 8: Smoke-test the demo app**

```bash
cd demo_app && python serve.py &
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/baseline/
# Expected: 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/flawed/
# Expected: 200
kill %1
```

- [ ] **Step 9: Commit**

```bash
git add requirements.txt .env.example .gitignore demo_app/ data/.gitkeep
git commit -m "feat: project scaffold and 3-version demo expense app"
```

---

### Task 2: Config + Database Schema

**Files:**
- Create: `backend/config.py`
- Create: `backend/models.py`
- Create: `backend/database.py`

**Interfaces:**
- Produces:
  - `config.AGENT_MODEL: str`, `config.TEXT_MODEL: str`, `config.GEMINI_RPM: int`, `config.DATA_DIR: Path`, `config.SCREENSHOTS_DIR: Path`, `config.DB_PATH: str`
  - SQLModel table classes: `Study`, `Variant`, `Persona`, `Run`, `Step`, `CalibrationRun`, `Fix`
  - `database.get_session() -> Generator[Session, None, None]`
  - `database.init_db() -> None`
  - `TIME_COST_SECONDS: dict[str, float]` = `{"click": 5, "type": 20, "scroll": 3, "wait": 2}`
  - `SEGMENT_MULTIPLIER: dict[str, float]` = `{"new_hire": 1.5, "power_user": 0.7, "non_native": 1.8, "frontline_mobile": 1.3, "low_vision": 2.0, "occasional": 1.4}`

- [ ] **Step 1: Write `backend/config.py`**

Load from environment (python-dotenv). Export:
- `AGENT_MODEL` from `GEMINI_AGENT_MODEL`
- `TEXT_MODEL` from `GEMINI_TEXT_MODEL`
- `GEMINI_RPM: int` from `GEMINI_RPM` (default 10)
- `DATA_DIR = Path("data")`
- `SCREENSHOTS_DIR = DATA_DIR / "screenshots"`
- `DB_PATH = str(DATA_DIR / "paraverse.db")`
- `TIME_COST_SECONDS` and `SEGMENT_MULTIPLIER` dicts as above

- [ ] **Step 2: Write `backend/models.py`**

SQLModel table classes. Every `id` field is `str`, default `lambda: str(uuid4())`, primary key. All foreign keys are `str`. JSON arrays/dicts stored as `str` (use `json.dumps`/`json.loads` at the service layer).

```python
class Study(SQLModel, table=True):
    id: str; name: str; task: str
    segment_mix: str  # JSON: {segment: count}
    created: datetime; status: str = "pending"; mode: str = "live"

class Variant(SQLModel, table=True):
    id: str; study_id: str; url: str; label: str; notes: str = ""

class Persona(SQLModel, table=True):
    id: str; study_id: str; segment: str
    tenure_years: float; tech_literacy: int; language_fluency: int
    device: str  # "desktop_800" or "mobile_375"
    patience_budget_steps: int; patience_budget_seconds: int
    accessibility_needs: str = "[]"  # JSON
    behavioral_rules: str = "[]"     # JSON

class Run(SQLModel, table=True):
    id: str; study_id: str; variant_id: str; persona_id: str
    outcome: Optional[str] = None  # completed | abandoned | error | step_cap
    duration_seconds: float = 0.0
    started_at: datetime; completed_at: Optional[datetime] = None

class Step(SQLModel, table=True):
    id: str; run_id: str; index: int
    screenshot_path: str = ""
    action: str; target_id: Optional[str] = None; value: Optional[str] = None
    thought: str = ""; confused: bool = False
    confusion_reason: str = ""; confidence: float = 1.0
    timestamp: datetime; human_time_seconds: float = 0.0

class CalibrationRun(SQLModel, table=True):
    id: str; rollout_name: str; known_winner: str; predicted_winner: str
    match: bool; direction_correct: bool
    persona_weights: str = "{}"  # JSON
    set_type: str  # "tuning" | "held_out"

class Fix(SQLModel, table=True):
    id: str; study_id: str; step_index: int
    suggestion: str; expected_impact: str; rank: int
    resimulated_result: Optional[str] = None  # JSON
```

- [ ] **Step 3: Write `backend/database.py`**

`init_db()` creates `data/` and `data/screenshots/` directories, then calls `SQLModel.metadata.create_all(engine)`. `get_session()` yields a `Session`. Engine uses `DB_PATH` from config.

- [ ] **Step 4: Verify schema creates cleanly**

```bash
cd backend && python -c "from database import init_db; init_db(); print('OK')"
# Expected: OK (and data/paraverse.db exists)
```

- [ ] **Step 5: Commit**

```bash
git add backend/config.py backend/models.py backend/database.py
git commit -m "feat: config, SQLite schema, and database init"
```

---

### Task 3: FastAPI Skeleton + Screenshot Serving

**Files:**
- Create: `backend/main.py`

**Interfaces:**
- Produces:
  - `GET /health` → `{"status": "ok"}`
  - `POST /api/studies` body: `{name, task, mode, segment_mix, variants: [{url, label}]}` → `Study` JSON
  - `GET /api/studies` → `list[Study]`
  - `GET /api/studies/{study_id}` → `Study` JSON
  - `GET /api/screenshots/{path:path}` → serves file from `data/screenshots/{path}`
  - CORS allowed for `http://localhost:5173`
  - SSE endpoint stubs (implemented in Task 7): `GET /api/studies/{study_id}/stream`, `GET /api/studies/{study_id}/replay`

- [ ] **Step 1: Write `backend/main.py` skeleton**

FastAPI app with CORSMiddleware allowing `http://localhost:5173`. Import and call `init_db()` on startup via `lifespan`. Wire all routes listed above. The SSE endpoints return `{"detail": "not implemented"}` for now.

- [ ] **Step 2: Verify health endpoint**

```bash
uvicorn backend.main:app --port 8000 &
curl http://localhost:8000/health
# Expected: {"status":"ok"}
kill %1
```

- [ ] **Step 3: Verify study creation round-trip**

```bash
uvicorn backend.main:app --port 8000 &
curl -s -X POST http://localhost:8000/api/studies \
  -H "Content-Type: application/json" \
  -d '{"name":"test","task":"submit expense","mode":"live","segment_mix":{"new_hire":2},"variants":[{"url":"http://localhost:3001/baseline/","label":"baseline"}]}' \
  | python -c "import sys,json; d=json.load(sys.stdin); assert d['status']=='pending'; print('OK')"
kill %1
```

- [ ] **Step 4: Commit**

```bash
git add backend/main.py
git commit -m "feat: FastAPI skeleton with study CRUD and screenshot serving"
```

---

### Task 4: Rate Limiter

**Files:**
- Create: `backend/rate_limiter.py`
- Create: `tests/test_rate_limiter.py`

**Interfaces:**
- Produces:
  - `class TokenBucket` — `__init__(rate_per_minute: int)`, `async acquire() -> None` (blocks until token available)
  - `async with_backoff(fn: Callable[[], Coroutine], max_retries=5) -> Any` — retries `fn()` on `google.api_core.exceptions.ResourceExhausted` with exponential backoff + jitter (base 2s, max 60s). Callers pass a zero-argument lambda so each retry gets a fresh coroutine.
  - `bucket: TokenBucket` — module-level singleton, rate from `config.GEMINI_RPM`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_rate_limiter.py
import asyncio, time, pytest
from backend.rate_limiter import TokenBucket, with_backoff

@pytest.mark.asyncio
async def test_bucket_allows_burst_up_to_rate():
    bucket = TokenBucket(rate_per_minute=6)  # 1 token/10s, but pre-fill 6
    # acquiring 6 tokens immediately should all succeed without blocking meaningfully
    start = time.monotonic()
    for _ in range(6):
        await bucket.acquire()
    assert time.monotonic() - start < 1.0  # all 6 tokens available immediately

@pytest.mark.asyncio
async def test_bucket_blocks_over_rate():
    bucket = TokenBucket(rate_per_minute=60)  # 1/second
    bucket._tokens = 1  # drain to 1
    t0 = time.monotonic()
    await bucket.acquire()  # uses last token
    await asyncio.wait_for(bucket.acquire(), timeout=2.5)  # must wait ~1s for refill
    assert time.monotonic() - t0 >= 0.9

@pytest.mark.asyncio
async def test_backoff_retries_on_resource_exhausted():
    from google.api_core.exceptions import ResourceExhausted
    call_count = 0
    async def flaky():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise ResourceExhausted("quota")
        return "ok"
    result = await with_backoff(lambda: flaky(), max_retries=5)
    assert result == "ok"
    assert call_count == 3
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_rate_limiter.py -v
# Expected: ImportError or AttributeError
```

- [ ] **Step 3: Implement `backend/rate_limiter.py`**

`TokenBucket`: store `_tokens` (float), `_rate` (tokens/second = RPM/60), `_last_refill` (monotonic time), `_lock` (asyncio.Lock). In `acquire()`: refill tokens based on elapsed time (cap at `_rate * 60` = burst), then if `_tokens >= 1` consume one, else `asyncio.sleep` until next token available.

`with_backoff`: receives a coroutine factory (callable → coroutine) not a live coroutine, so callers pass a lambda. Retry loop: catch `ResourceExhausted`, sleep `min(2 ** attempt + jitter, 60)` where `jitter = random.uniform(0, 1)`.

Module-level `bucket = TokenBucket(rate_per_minute=config.GEMINI_RPM)`.

- [ ] **Step 4: Add Review Focus test (Gemini 429 mid-swarm)**

```python
@pytest.mark.asyncio
async def test_backoff_exhausts_retries_and_raises():
    from google.api_core.exceptions import ResourceExhausted
    async def always_fails():
        raise ResourceExhausted("quota")
    with pytest.raises(ResourceExhausted):
        await with_backoff(lambda: always_fails(), max_retries=3)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/test_rate_limiter.py -v
# Expected: all PASS
```

- [ ] **Step 6: Commit**

```bash
git add backend/rate_limiter.py tests/test_rate_limiter.py
git commit -m "feat: token-bucket rate limiter with exponential backoff"
```

---

### Task 5: Persona Generator

**Files:**
- Create: `backend/persona_generator.py`
- Create: `tests/test_persona_generator.py`

**Interfaces:**
- Consumes: `config.TEXT_MODEL`, `TokenBucket.acquire()`, `Persona` SQLModel class, `get_session()`
- Produces:
  - `async generate_personas(study_id: str, segment_mix: dict[str, int]) -> list[Persona]`
  - Default segment mix: `{"new_hire": 4, "power_user": 3, "non_native": 3, "frontline_mobile": 4, "low_vision": 2, "occasional": 4}` (total 20)
  - Each persona JSON from Gemini must conform to the schema in the spec; validated with `pydantic` before insertion

- [ ] **Step 1: Write failing tests**

```python
# tests/test_persona_generator.py
import pytest, json
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_generate_personas_count_matches_mix():
    mix = {"new_hire": 2, "power_user": 1}
    with patch("backend.persona_generator._call_gemini", new_callable=AsyncMock) as mock:
        mock.return_value = json.dumps({
            "id": "p_001", "segment": "new_hire", "tenure_years": 0.5,
            "tech_literacy": 3, "language_fluency": 5, "device": "desktop_800",
            "patience_budget_steps": 10, "patience_budget_seconds": 180,
            "accessibility_needs": [], "behavioral_rules": ["Read all labels carefully."]
        })
        from backend.persona_generator import generate_personas
        personas = await generate_personas("study_1", mix)
    assert len(personas) == 3
    assert sum(1 for p in personas if p.segment == "new_hire") == 2
    assert sum(1 for p in personas if p.segment == "power_user") == 1

@pytest.mark.asyncio
async def test_generate_personas_device_by_segment():
    mix = {"frontline_mobile": 1}
    with patch("backend.persona_generator._call_gemini", new_callable=AsyncMock) as mock:
        mock.return_value = json.dumps({
            "id": "p_x", "segment": "frontline_mobile", "tenure_years": 1.0,
            "tech_literacy": 2, "language_fluency": 4, "device": "mobile_375",
            "patience_budget_steps": 8, "patience_budget_seconds": 120,
            "accessibility_needs": [], "behavioral_rules": []
        })
        from backend.persona_generator import generate_personas
        personas = await generate_personas("study_1", mix)
    assert personas[0].device == "mobile_375"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_persona_generator.py -v
# Expected: ImportError
```

- [ ] **Step 3: Implement `backend/persona_generator.py`**

`_call_gemini(segment: str, index: int) -> str`: acquires a token from `bucket`, calls Gemini text model with a system prompt encoding segment traits and returning strict JSON conforming to the persona schema. Returns the raw JSON string.

`generate_personas`: for each segment and count, call `_call_gemini`, parse JSON, validate required fields (raise `ValueError` if missing), construct `Persona` objects with `study_id`, persist to DB, return list.

Gemini system prompt must include: segment name, trait ranges, device assignment rule (`frontline_mobile` and `low_vision` → `mobile_375`; all others → `desktop_800`), and the behavioral rules format.

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_persona_generator.py -v
# Expected: all PASS
```

- [ ] **Step 5: Wire endpoint into `backend/main.py`**

`POST /api/studies/{study_id}/personas` body: `{segment_mix: dict[str,int]}` → calls `generate_personas`, returns `list[Persona]`.

- [ ] **Step 6: Commit**

```bash
git add backend/persona_generator.py tests/test_persona_generator.py backend/main.py
git commit -m "feat: persona generator with Gemini text model"
```

---

### Task 6: Agent Loop

**Files:**
- Create: `backend/agent_loop.py`
- Create: `tests/test_agent_loop.py`

**Interfaces:**
- Consumes: `config.AGENT_MODEL`, `bucket.acquire()`, `with_backoff`, `Step` model, `get_session()`, `TIME_COST_SECONDS`, `SEGMENT_MULTIPLIER`
- Produces:
  - `async run_agent(run_id: str, persona: Persona, variant_url: str, task_goal: str, sse_queue: asyncio.Queue) -> str` — returns outcome string: `"completed" | "abandoned" | "error" | "step_cap"`
  - `extract_elements(page) -> list[dict]` — returns `[{id, tag, text, role, visible}]` for all interactive elements with an `id` attribute
  - `compute_human_time(action: str, segment: str) -> float` — returns seconds using `TIME_COST_SECONDS[action] * SEGMENT_MULTIPLIER[segment]`
  - Action schema validated via pydantic `AgentAction` model before execution

- [ ] **Step 1: Write failing tests**

```python
# tests/test_agent_loop.py
import pytest
from backend.agent_loop import compute_human_time, extract_elements

def test_compute_human_time_new_hire_click():
    # click=5 * new_hire=1.5 = 7.5
    assert compute_human_time("click", "new_hire") == pytest.approx(7.5)

def test_compute_human_time_power_user_type():
    # type=20 * power_user=0.7 = 14.0
    assert compute_human_time("type", "power_user") == pytest.approx(14.0)

def test_compute_human_time_frontline_scroll():
    # scroll=3 * frontline_mobile=1.3 = 3.9
    assert compute_human_time("scroll", "frontline_mobile") == pytest.approx(3.9)
```

- [ ] **Step 2: Add Review Focus tests**

```python
# Hallucinated element ID → error, agent stops
@pytest.mark.asyncio
async def test_invalid_target_id_logs_error_and_stops():
    import asyncio
    from unittest.mock import AsyncMock, MagicMock, patch
    import json

    fake_action = json.dumps({
        "thought": "I see a button",
        "confused": False, "confusion_reason": "",
        "action": "click",
        "target_id": "el_NONEXISTENT",  # not in element list
        "value": None, "confidence": 0.9
    })
    mock_persona = MagicMock()
    mock_persona.segment = "new_hire"
    mock_persona.device = "desktop_800"
    mock_persona.patience_budget_steps = 10
    mock_persona.patience_budget_seconds = 300
    mock_persona.behavioral_rules = "[]"
    mock_persona.id = "p_test"

    queue = asyncio.Queue()
    with patch("backend.agent_loop._gemini_step", new_callable=AsyncMock, return_value=fake_action), \
         patch("backend.agent_loop._launch_browser") as mock_browser:
        page = AsyncMock()
        page.screenshot = AsyncMock(return_value=b"fake")
        page.evaluate = AsyncMock(return_value=[{"id": "el_1", "tag": "button", "text": "Next", "role": "button", "visible": True}])
        mock_browser.return_value.__aenter__ = AsyncMock(return_value=page)
        mock_browser.return_value.__aexit__ = AsyncMock(return_value=None)

        from backend.agent_loop import run_agent
        with patch("backend.agent_loop.get_session"):
            outcome = await run_agent("run_1", mock_persona, "http://localhost:3001/baseline/", "submit expense", queue)
    assert outcome == "error"

# Patience budget exhaustion → abandoned
@pytest.mark.asyncio
async def test_patience_budget_exhaustion_produces_abandoned():
    import asyncio
    from unittest.mock import AsyncMock, MagicMock, patch
    import json

    # Agent keeps clicking same button (valid id), never reaches goal_reached
    fake_action = json.dumps({
        "thought": "trying", "confused": False, "confusion_reason": "",
        "action": "click", "target_id": "el_1", "value": None, "confidence": 0.5
    })
    mock_persona = MagicMock()
    mock_persona.segment = "frontline_mobile"
    mock_persona.device = "mobile_375"
    mock_persona.patience_budget_steps = 2  # very low
    mock_persona.patience_budget_seconds = 999
    mock_persona.behavioral_rules = "[]"
    mock_persona.id = "p_test2"

    queue = asyncio.Queue()
    with patch("backend.agent_loop._gemini_step", new_callable=AsyncMock, return_value=fake_action), \
         patch("backend.agent_loop._launch_browser") as mock_browser:
        page = AsyncMock()
        page.screenshot = AsyncMock(return_value=b"fake")
        page.evaluate = AsyncMock(return_value=[{"id": "el_1", "tag": "button", "text": "Next", "role": "button", "visible": True}])
        page.click = AsyncMock()
        mock_browser.return_value.__aenter__ = AsyncMock(return_value=page)
        mock_browser.return_value.__aexit__ = AsyncMock(return_value=None)

        from backend.agent_loop import run_agent
        with patch("backend.agent_loop.get_session"):
            outcome = await run_agent("run_2", mock_persona, "http://localhost:3001/baseline/", "submit expense", queue)
    assert outcome == "abandoned"
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pytest tests/test_agent_loop.py -v
# Expected: ImportError
```

- [ ] **Step 4: Implement `backend/agent_loop.py`**

`compute_human_time(action, segment) -> float`: look up `TIME_COST_SECONDS[action]` (default 2 for unknown) × `SEGMENT_MULTIPLIER.get(segment, 1.0)`.

`extract_elements(page) -> list[dict]`: `page.evaluate(JS)` where JS queries all `a, button, input, select, textarea` with an `id` attribute, returns list of `{id, tag, text, role, visible}`.

`_gemini_step(model, prompt, screenshot_bytes) -> str`: acquires bucket token, calls Gemini vision with screenshot + prompt, returns raw JSON string.

`_launch_browser(device)`: async context manager yielding a Playwright page. Viewport: `{"width": 800, "height": 600}` for `desktop_800`, `{"width": 375, "height": 667}` for `mobile_375`.

`run_agent(run_id, persona, variant_url, task_goal, sse_queue) -> str`:
1. Launch browser, navigate to `variant_url`
2. Loop up to `min(persona.patience_budget_steps, 12)` steps:
   a. Capture screenshot (JPEG, 60% quality)
   b. Extract elements
   c. Build prompt (persona traits + behavioral_rules + task_goal + last 3 steps + element list)
   d. Call `_gemini_step` via `with_backoff`
   e. Parse and validate JSON as `AgentAction` pydantic model
   f. **If `target_id` not None and `target_id` not in element id set → log error step, return `"error"`**
   g. Execute action (click → `page.click(f"#{target_id}")`; type → `page.fill`; scroll → `page.evaluate("window.scrollBy(0,300)")`; wait → `asyncio.sleep(1)`; give_up → return `"abandoned"`; goal_reached → return `"completed"`)
   h. Compute `human_time_seconds`, log `Step` to DB, save screenshot to disk
   i. Put SSE event on `sse_queue`
3. After loop: if step count == patience_budget_steps → return `"abandoned"`; if step count == 12 → return `"step_cap"`

`AgentAction` pydantic model: fields `thought: str`, `confused: bool`, `confusion_reason: str`, `action: Literal["click","type","scroll","wait","give_up","goal_reached"]`, `target_id: Optional[str]`, `value: Optional[str]`, `confidence: float`.

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/test_agent_loop.py -v
# Expected: all PASS
```

- [ ] **Step 6: Commit**

```bash
git add backend/agent_loop.py tests/test_agent_loop.py
git commit -m "feat: swarm agent loop with Playwright + Gemini vision"
```

---

### Task 7: Swarm Runner + SSE Endpoints

**Files:**
- Modify: `backend/main.py`
- Create: `backend/swarm_runner.py`

**Interfaces:**
- Consumes: `run_agent`, `generate_personas`, `Study`, `Variant`, `Persona`, `Run`, `Step`, `get_session`
- Produces:
  - `async run_study(study_id: str, sse_queue: asyncio.Queue) -> None` — generates personas, creates runs, fans out `run_agent` calls concurrently (up to `GEMINI_RPM` parallel, controlled by semaphore), updates run outcomes in DB
  - `async replay_study(study_id: str, sse_queue: asyncio.Queue) -> None` — reads all `Step` rows for the study, streams them as SSE events in order with `asyncio.sleep(0.1)` between steps. **Zero Gemini calls.**
  - `GET /api/studies/{study_id}/stream` — SSE endpoint; starts `run_study` as background task, yields events from queue until `{"type":"run_complete"}` or client disconnect
  - `GET /api/studies/{study_id}/replay` — SSE endpoint; starts `replay_study`, same yield loop

- [ ] **Step 1: Write failing Review Focus test (replay makes zero Gemini calls)**

```python
# tests/test_swarm_runner.py
import asyncio, pytest
from unittest.mock import AsyncMock, patch, MagicMock

@pytest.mark.asyncio
async def test_replay_study_makes_no_gemini_calls(tmp_path, monkeypatch):
    gemini_called = False
    async def spy_gemini(*a, **kw):
        nonlocal gemini_called
        gemini_called = True
        return "{}"
    monkeypatch.setattr("backend.agent_loop._gemini_step", spy_gemini)

    queue = asyncio.Queue()
    # Seed DB with a completed run and 3 steps
    with patch("backend.swarm_runner.get_session") as mock_sess:
        mock_run = MagicMock(id="r1", persona_id="p1", variant_id="v1")
        mock_steps = [MagicMock(index=i, action="click", thought="ok", confused=False,
                                screenshot_path="") for i in range(3)]
        session = MagicMock()
        session.exec.return_value.all.side_effect = [[mock_run], mock_steps]
        mock_sess.return_value.__enter__ = MagicMock(return_value=session)
        mock_sess.return_value.__exit__ = MagicMock(return_value=None)
        from backend.swarm_runner import replay_study
        await replay_study("study_1", queue)

    assert not gemini_called, "replay_study must not call Gemini"
    assert not queue.empty()  # events were put on queue
```

- [ ] **Step 2: Run to verify it fails**

```bash
pytest tests/test_swarm_runner.py -v
# Expected: ImportError
```

- [ ] **Step 3: Implement `backend/swarm_runner.py`**

`run_study(study_id, sse_queue)`:
- Load study, variants, personas from DB
- Create `Run` rows (one per persona per variant), status `pending`
- Semaphore with `min(GEMINI_RPM, 5)` slots (cap parallel agents at 5 to stay within rate limit)
- `asyncio.gather` all `run_agent` coroutines under the semaphore
- On each completion: update `Run.outcome` and `Run.completed_at` in DB
- After all agents: compute summary (completion rate, drop-off step), put `{"type":"run_complete", ...}` on queue

`replay_study(study_id, sse_queue)`:
- Load all `Run` rows for study, sorted by `started_at`
- For each run, load its `Step` rows ordered by `index`
- For each step, put SSE event on queue (same format as live events), `await asyncio.sleep(0.1)`
- Put `{"type":"run_complete"}` at end

- [ ] **Step 2: Wire SSE endpoints in `backend/main.py`**

Both endpoints use `StreamingResponse(event_generator(), media_type="text/event-stream")`. The generator creates an `asyncio.Queue`, starts the runner as an `asyncio.create_task`, then yields `f"data: {json.dumps(event)}\n\n"` for each item from the queue until the run_complete event.

- [ ] **Step 4: Run test to verify it passes**

```bash
pytest tests/test_swarm_runner.py -v
# Expected: PASS
```

- [ ] **Step 5: Manual smoke test**

```bash
# Terminal 1
python demo_app/serve.py &
uvicorn backend.main:app --port 8000

# Terminal 2 — create study and stream
STUDY=$(curl -s -X POST http://localhost:8000/api/studies \
  -H "Content-Type: application/json" \
  -d '{"name":"smoke","task":"submit expense","mode":"live","segment_mix":{"new_hire":1},"variants":[{"url":"http://localhost:3001/baseline/","label":"baseline"}]}' | python -c "import sys,json; print(json.load(sys.stdin)['id'])")
curl -N http://localhost:8000/api/studies/$STUDY/stream
# Expected: SSE events with step data, ending with run_complete
```

- [ ] **Step 6: Commit**

```bash
git add backend/swarm_runner.py tests/test_swarm_runner.py backend/main.py
git commit -m "feat: async swarm runner with SSE live stream and replay mode"
```

---

### Task 8: Metrics Engine

**Files:**
- Create: `backend/metrics.py`
- Create: `tests/test_metrics.py`

**Interfaces:**
- Consumes: `Run`, `Step`, `Variant`, `get_session`, `TIME_COST_SECONDS`, `SEGMENT_MULTIPLIER`
- Produces:
  - `dataclass StudyMetrics` with fields: `completion_rate: float`, `avg_time_on_task: float`, `drop_off_step: int`, `confusion_rate: float`, `by_variant: list[VariantMetrics]`, `by_segment: dict[str, VariantMetrics]`
  - `dataclass VariantMetrics`: `variant_id`, `variant_label`, `completion_rate`, `avg_time_on_task`, `drop_off_step`, `confusion_rate`, `funnel: list[float]` (completion rate per step index)
  - `compute_metrics(study_id: str, session: Session) -> StudyMetrics`
  - `compute_hours_lost(n_employees: int, freq_per_year: int, extra_minutes: float) -> float` → `N × F × Δm / 60`
  - `GET /api/studies/{study_id}/metrics?n_employees=&freq_per_year=` → `StudyMetrics` JSON

- [ ] **Step 1: Write failing tests**

```python
# tests/test_metrics.py
from backend.metrics import compute_hours_lost, compute_metrics

def test_hours_lost_formula():
    # H = N * F * delta_m / 60
    # 20000 employees, 12 times/year, 4 extra minutes → 16000 hours
    assert compute_hours_lost(20000, 12, 4.0) == pytest.approx(16000.0)

def test_hours_lost_zero_delta():
    assert compute_hours_lost(20000, 12, 0.0) == pytest.approx(0.0)

def test_completion_rate_all_completed(db_session_with_runs):
    # Fixture provides 3 runs: 3 completed, 0 abandoned
    metrics = compute_metrics("study_1", db_session_with_runs)
    assert metrics.completion_rate == pytest.approx(1.0)

def test_drop_off_step_majority_abandons(db_session_with_runs_step3):
    # Fixture provides 5 runs all abandoned at step 3
    metrics = compute_metrics("study_2", db_session_with_runs_step3)
    assert metrics.drop_off_step == 3
```

- [ ] **Step 2: Run to verify they fail**

```bash
pytest tests/test_metrics.py -v
# Expected: ImportError
```

- [ ] **Step 3: Implement `backend/metrics.py`**

`compute_hours_lost(n, f, delta_m) -> float`: `n * f * delta_m / 60`.

`compute_metrics(study_id, session)`:
- Load all `Run` rows for study
- For each variant: filter runs, compute `completion_rate` (completed/total), load steps, sum `human_time_seconds` per run then average, find most common last step index among abandoned runs for `drop_off_step`, count confused steps / total steps for `confusion_rate`, compute `funnel` as list of `(runs reaching step i / total runs)` for i in 0..max_steps
- Aggregate across variants for top-level metrics

- [ ] **Step 4: Wire endpoint in `backend/main.py`**

`GET /api/studies/{study_id}/metrics` with optional query params `n_employees: int = 20000`, `freq_per_year: int = 12`. Returns `StudyMetrics` as JSON dict.

- [ ] **Step 6: Run tests to verify they pass**

```bash
pytest tests/test_metrics.py -v
# Expected: all PASS
```

- [ ] **Step 7: Commit**

```bash
git add backend/metrics.py tests/test_metrics.py backend/main.py
git commit -m "feat: metrics engine with hours-lost calculator"
```

---

### Task 9: Calibration Seeds + Module

**Files:**
- Create: `calibration_seeds/rollouts.json`
- Create: `backend/calibration.py`
- Create: `tests/test_calibration.py`

**Interfaces:**
- Consumes: `CalibrationRun`, `get_session`
- Produces:
  - `dataclass CalibrationResult`: `uncalibrated_accuracy: float`, `calibrated_tuning_accuracy: float`, `calibrated_holdout_accuracy: float`, `total_rollouts: int`, `holdout_count: int`, `optimal_weights: dict[str, float]`, `disclaimer: str`
  - `run_calibration(session: Session) -> CalibrationResult`
  - `predict_winner(variant_metrics: list[VariantMetrics], weights: dict[str, float]) -> str` — weighted completion rate across segments
  - `GET /api/calibration` → `CalibrationResult` JSON

- [ ] **Step 1: Write `calibration_seeds/rollouts.json`**

8 rollout records. Each: `{name, known_winner, variants: [{label, url}], segment_outcomes: {segment: {label: completion_rate}}}`. Indices 0–5 are tuning set; 6–7 are held-out (labeled in the file as `"set": "tuning"` or `"held_out"`).

Sample scenarios:
- 0: "Expense form: baseline vs jargon-heavy" — known winner: baseline
- 1: "Onboarding: multi-page vs single-page" — known winner: single-page
- 2: "Leave request: dropdown vs date-picker" — known winner: date-picker
- 3: "IT ticket: unmarked vs marked required fields" — known winner: marked
- 4: "Benefits: jargon vs plain language" — known winner: plain-language
- 5: "Password reset: multi-step vs single-step" — known winner: single-step
- 6 (held-out): "Profile update: inline edit vs modal" — known winner: inline-edit
- 7 (held-out): "Report submit: wizard vs flat form" — known winner: wizard

- [ ] **Step 2: Write failing tests**

```python
# tests/test_calibration.py
from backend.calibration import predict_winner, run_calibration

def test_predict_winner_higher_completion_wins():
    from backend.metrics import VariantMetrics
    v1 = VariantMetrics(variant_id="a", variant_label="baseline",
                        completion_rate=0.80, avg_time_on_task=60,
                        drop_off_step=3, confusion_rate=0.1, funnel=[])
    v2 = VariantMetrics(variant_id="b", variant_label="flawed",
                        completion_rate=0.45, avg_time_on_task=90,
                        drop_off_step=2, confusion_rate=0.4, funnel=[])
    weights = {"new_hire": 1.0, "power_user": 1.0}  # uniform
    winner = predict_winner([v1, v2], weights)
    assert winner == "baseline"

def test_calibration_holdout_uses_only_indices_6_7():
    # Tuning set must only use indices 0-5; held-out evaluation uses 6-7
    from backend.calibration import TUNING_INDICES, HOLDOUT_INDICES
    assert TUNING_INDICES == list(range(6))
    assert HOLDOUT_INDICES == [6, 7]
    assert set(TUNING_INDICES) & set(HOLDOUT_INDICES) == set()
```

- [ ] **Step 3: Run to verify they fail**

```bash
pytest tests/test_calibration.py -v
# Expected: ImportError
```

- [ ] **Step 4: Implement `backend/calibration.py`**

Module-level constants:
```python
TUNING_INDICES = list(range(6))
HOLDOUT_INDICES = [6, 7]
```

`predict_winner(variant_metrics, weights) -> str`: for each variant, compute weighted mean completion rate using `weights.get(segment, 1.0)` for each segment; return label of highest.

`run_calibration(session) -> CalibrationResult`:
1. Load `rollouts.json`
2. For tuning set (indices 0–5): compute uncalibrated predictions (uniform weights `{seg: 1.0}`) vs known winner; uncalibrated_accuracy = matches / 6
3. Optimize `weights` using a numpy grid search: for each segment, try multipliers `[0.5, 1.0, 1.5, 2.0]`; test all combinations on the 6 tuning rollouts; keep the vector with highest accuracy. Use `itertools.product` over the multiplier values.
4. Re-evaluate tuning set with optimal weights: calibrated_tuning_accuracy
5. Evaluate held-out (indices 6–7) with optimal weights: calibrated_holdout_accuracy
6. Persist `CalibrationRun` rows to DB
7. Return `CalibrationResult` with disclaimer: `"Seeded illustrative data. N=8 rollouts; directional only."`

- [ ] **Step 5: Add Review Focus test (held-out isolation)**

```python
def test_calibration_weight_optimization_never_sees_holdout():
    # The optimization loop must not use indices 6 or 7
    import json, pathlib
    rollouts = json.loads(pathlib.Path("calibration_seeds/rollouts.json").read_text())
    holdout_names = {rollouts[i]["name"] for i in [6, 7]}
    # If we simulate calibration with a spy, the optimizer must not receive holdout data
    from backend.calibration import TUNING_INDICES, HOLDOUT_INDICES
    for i in TUNING_INDICES:
        assert i not in HOLDOUT_INDICES
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pytest tests/test_calibration.py -v
# Expected: all PASS
```

- [ ] **Step 7: Wire endpoint in `backend/main.py`**

`GET /api/calibration` → calls `run_calibration(session)`, returns `CalibrationResult` as JSON. Cache result in-memory after first call (calibration is expensive).

- [ ] **Step 8: Commit**

```bash
git add calibration_seeds/rollouts.json backend/calibration.py tests/test_calibration.py backend/main.py
git commit -m "feat: calibration module with 8 seeded rollouts and held-out evaluation"
```

---

### Task 10: Fix Suggester

**Files:**
- Create: `backend/fix_suggester.py`

**Interfaces:**
- Consumes: `config.TEXT_MODEL`, `bucket.acquire()`, `with_backoff`, `Step`, `Fix`, `get_session`
- Produces:
  - `async suggest_fixes(study_id: str, variant_id: str, session: Session) -> list[Fix]`
  - `POST /api/studies/{study_id}/fixes` body: `{variant_id: str}` → `list[Fix]` JSON
  - `GET /api/studies/{study_id}/fixes` → `list[Fix]` JSON (previously generated)

- [ ] **Step 1: Implement `backend/fix_suggester.py`**

`suggest_fixes(study_id, variant_id, session)`:
1. Load runs for this variant; find `drop_off_step` (step index where most runs ended)
2. Load up to 5 `Step` rows at that index with `confused=True`, extract `thought` quotes and `screenshot_path`
3. Build prompt: worst step description, screenshot (if available), confusion quotes
4. Acquire bucket token, call Gemini text model requesting JSON array of `{rank, suggestion, expected_impact}` (ranked 1–5)
5. Parse, validate, persist as `Fix` rows with `study_id` and `step_index`
6. Return list of `Fix` objects

- [ ] **Step 2: Wire endpoints in `backend/main.py`**

`POST /api/studies/{study_id}/fixes` calls `suggest_fixes`. `GET /api/studies/{study_id}/fixes` queries DB for existing fixes for the study.

- [ ] **Step 3: Commit**

```bash
git add backend/fix_suggester.py backend/main.py
git commit -m "feat: Gemini-powered fix suggester for worst friction step"
```

---

### Task 11: React Scaffold + Setup Screen

**Files:**
- Create: `frontend/` (Vite scaffold)
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/pages/Setup.tsx`

**Interfaces:**
- Produces:
  - `api.createStudy(payload) -> Promise<Study>` — `POST /api/studies`
  - `api.listStudies() -> Promise<Study[]>` — `GET /api/studies`
  - `api.getMetrics(studyId, n, f) -> Promise<StudyMetrics>` — `GET /api/studies/{id}/metrics`
  - `api.generateFixes(studyId, variantId) -> Promise<Fix[]>` — `POST /api/studies/{id}/fixes`
  - `api.getFixes(studyId) -> Promise<Fix[]>` — `GET /api/studies/{id}/fixes`
  - `api.getCalibration() -> Promise<CalibrationResult>` — `GET /api/calibration`
  - Routes: `/` → `<Setup>`, `/swarm/:studyId` → `<SwarmWall>`, `/report/:studyId` → `<Report>`, `/fix/:studyId` → `<FixLoop>`

- [ ] **Step 1: Scaffold Vite + Tailwind**

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install react-router-dom recharts
```

Tailwind config: content `["./src/**/*.{ts,tsx}"]`. Add `@tailwind` directives to `src/index.css`.

- [ ] **Step 2: Write `frontend/src/api/client.ts`**

All functions use `fetch` with base URL `http://localhost:8000`. TypeScript interfaces matching backend response shapes: `Study`, `Variant`, `StudyMetrics`, `VariantMetrics`, `Fix`, `CalibrationResult`. Every function throws on non-2xx.

- [ ] **Step 3: Write `frontend/src/App.tsx`**

`BrowserRouter` with four `Route`s as listed in Interfaces. Import pages lazily.

- [ ] **Step 4: Write `frontend/src/pages/Setup.tsx`**

Form fields:
- Demo picker: radio group with "Baseline vs Flawed" (pre-fills URLs to `http://localhost:3001/baseline/` and `http://localhost:3001/flawed/`) and "Baseline vs Fixed" and "Custom URL"
- Task description: text input, default "Submit an expense report"
- Mode toggle: "Live" / "Recorded"
- Segment sliders: one per segment (new_hire, power_user, non_native, frontline_mobile, low_vision, occasional), default values summing to 20
- Agent count: derived from slider sum, shown read-only
- Hours-lost inputs: n_employees (default 20000), freq_per_year (default 12)
- Submit → calls `api.createStudy(...)`, navigates to `/swarm/{studyId}`

- [ ] **Step 5: Verify Setup screen renders**

```bash
cd frontend && npm run dev
# Open http://localhost:5173 — Setup form visible, no console errors
```

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: React scaffold, API client, and Setup screen"
```

---

### Task 12: Swarm Wall

**Files:**
- Create: `frontend/src/pages/SwarmWall.tsx`
- Create: `frontend/src/components/AgentCard.tsx`

**Interfaces:**
- Consumes: backend SSE endpoint `GET /api/studies/{studyId}/stream` or `/replay`
- SSE event types: `"step"` (fields: `agent_id, persona_segment, step_index, action, thought, confused, status, screenshot_path`), `"terminal"` (fields: `agent_id, outcome, total_steps`), `"run_complete"` (fields: `study_id, completion_rate, drop_off_step`)

- [ ] **Step 1: Write `frontend/src/components/AgentCard.tsx`**

Props: `agentId: string`, `segment: string`, `stepIndex: number`, `thought: string`, `confused: boolean`, `status: "running"|"completed"|"abandoned"|"error"|"step_cap"`, `screenshotUrl: string | null`.

Layout: fixed 200×180px card. Top: status badge (green=completed, yellow=running, red=abandoned/error). Middle: screenshot `<img>` (or grey placeholder). Bottom: step count + truncated thought caption. Red border when `confused`.

- [ ] **Step 2: Write `frontend/src/pages/SwarmWall.tsx`**

On mount: open `EventSource` to `/api/studies/{studyId}/stream` (or `/replay` if mode=recorded). Maintain `Map<agentId, AgentState>` in state. On each SSE event: upsert agent state. Render grid of `<AgentCard>`. Progress bar: completed_runs / total_runs. Queue indicator: show "Waiting for token" when a `"queued"` event arrives. On `run_complete`: navigate to `/report/{studyId}` after 2s delay.

- [ ] **Step 3: Verify swarm wall updates live**

Start backend + demo app. Create study from Setup. Watch cards populate. Confirm confused cards show red border and think-aloud captions.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/SwarmWall.tsx frontend/src/components/AgentCard.tsx
git commit -m "feat: swarm wall with live SSE agent grid"
```

---

### Task 13: Report Screen

**Files:**
- Create: `frontend/src/pages/Report.tsx`
- Create: `frontend/src/components/Funnel.tsx`
- Create: `frontend/src/components/HoursLost.tsx`

**Interfaces:**
- Consumes: `api.getMetrics(studyId, n, f)` → `StudyMetrics`
- `Funnel` props: `variants: VariantMetrics[]` — renders grouped bar chart (x=step index, y=completion rate, one bar group per variant) using Recharts `BarChart`
- `HoursLost` props: `extraMinutes: number`, `defaultN: number`, `defaultF: number` — editable inputs, shows computed `H = N × F × Δm / 60`, confidence badge

- [ ] **Step 1: Write `frontend/src/components/Funnel.tsx`**

Recharts `BarChart` with `XAxis` (step index), `YAxis` (0–100%), one `Bar` per variant, `Tooltip` showing completion rate and confusion rate, `Legend`. Colors: at least 2 distinct, not color-only distinguished (add pattern or label).

- [ ] **Step 2: Write `frontend/src/components/HoursLost.tsx`**

Two `<input type="number">` for N and F, read from props as defaults. Computes `H` on change. Large display: `"{H.toLocaleString()} hours lost/year"`. Below: `"{ticketsAvoided} support tickets avoided"` (confusionDelta × N × F × 0.02).

- [ ] **Step 3: Write `frontend/src/pages/Report.tsx`**

On mount: call `api.getMetrics(studyId, 20000, 12)`. Layout:
- Top: segment filter dropdown (all segments + per-segment)
- Funnel chart per variant
- Confusion clusters section: list worst-step confusion quotes (verbatim, from `step.thought` where `confused=true` at `drop_off_step`)
- `<HoursLost>` with `extraMinutes` from metrics
- Confidence badge: shows `calibration.calibrated_holdout_accuracy * 100`% accuracy, tooltip "Based on {N} seeded rollouts, directional only"
- Button: "Get Fix Suggestions" → navigates to `/fix/{studyId}`

- [ ] **Step 4: Verify Report renders correctly with a completed study**

Run a full study (even 1–2 agents). Navigate to `/report/{studyId}`. Confirm funnel bars render, hours-lost number appears, confidence badge visible.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Report.tsx frontend/src/components/Funnel.tsx frontend/src/components/HoursLost.tsx
git commit -m "feat: report screen with funnel, hours lost, and confidence badge"
```

---

### Task 14: Fix Loop + Calibration Chart

**Files:**
- Create: `frontend/src/pages/FixLoop.tsx`
- Create: `frontend/src/components/CalibrationChart.tsx`

**Interfaces:**
- Consumes: `api.generateFixes(studyId, variantId)`, `api.getFixes(studyId)`, `api.getCalibration()`
- `CalibrationChart` props: `data: CalibrationResult` — three-bar chart labeled "Uncalibrated", "Calibrated (tuning)", "Calibrated (held-out)"; disclaimer text below; `"Seeded illustrative data"` label on chart title

- [ ] **Step 1: Write `frontend/src/components/CalibrationChart.tsx`**

Recharts `BarChart` with three bars (single bar group). Y-axis 0–100% (accuracy). Each bar labeled with exact % value above it. Below chart: `<p className="text-xs text-gray-500">{data.disclaimer}</p>`. Title: "Prediction Accuracy — Seeded Illustrative Data".

- [ ] **Step 2: Write `frontend/src/pages/FixLoop.tsx`**

On mount: `api.getCalibration()` to populate `<CalibrationChart>`. Also: `api.getFixes(studyId)` (or generate if none). Layout:
- `<CalibrationChart>` at top right (collapsible)
- Ranked fix list: each fix shows rank, suggestion text, expected impact badge
- Variant picker dropdown (populated from study's variants) — labeled "Re-run with this variant to see improvement"
- "Re-run" button → calls `api.createStudy(...)` with same config but single selected variant, navigates to `/swarm/{newStudyId}` — this is the re-simulation
- Before/after delta section: if a re-simulation study exists, show drop-off step comparison side by side ("Was: 45% abandon at step 3 → Now: 12%")

- [ ] **Step 3: Verify calibration chart renders with real numbers**

Navigate to `/fix/{studyId}`. Confirm three bars render with distinct heights and disclaimer text is visible.

- [ ] **Step 4: Verify re-simulation flow end to end**

From Fix Loop: select fixed variant, click Re-run, confirm swarm wall opens for new study, confirm report shows reduced drop-off.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/FixLoop.tsx frontend/src/components/CalibrationChart.tsx
git commit -m "feat: fix loop with calibration chart and re-simulation trigger"
```

---

### Task 15: Integration Polish + Replay Mode Verification

**Files:**
- Modify: `backend/main.py` (install Playwright browsers check on startup)
- Create: `README.md`

**Interfaces:**
- Produces: working end-to-end demo path; replay mode verified to make zero Gemini calls; README with setup steps

- [ ] **Step 1: Add Playwright browser install check to startup**

In `lifespan` handler: `subprocess.run(["playwright", "install", "chromium"], check=True)` if `chromium` not already installed.

- [ ] **Step 2: Verify full demo path end to end**

```
Setup (Baseline vs Flawed, 5 new_hire + 5 frontline_mobile) →
Swarm wall (10 agents, live) →
Report (flawed variant shows drop-off at step 3, hours-lost > 0) →
Fix Loop (calibration chart with 3 bars, fix suggestion mentions "cost center") →
Re-run with Fixed variant →
Swarm wall (replay or live) →
Report (drop-off at step 3 reduced by ≥50%)
```

- [ ] **Step 3: Verify replay mode makes zero Gemini calls**

Add temporary log line in `_gemini_step` (`print("GEMINI CALLED")`). Start replay of a stored study. Confirm "GEMINI CALLED" does not appear in output. Remove log line.

- [ ] **Step 4: Write `README.md`**

Setup steps: clone, `pip install -r requirements.txt`, `playwright install chromium`, copy `.env.example` to `.env` and add API key, `cd frontend && npm install && npm run build`, `uvicorn backend.main:app --port 8000`, open `http://localhost:8000`.

Cost notes: free Gemini API key, no billing enabled, token-bucket limits Gemini calls to `GEMINI_RPM` per minute.

- [ ] **Step 5: Final commit**

```bash
git add backend/main.py README.md
git commit -m "chore: playwright install check, README, and integration polish"
```
