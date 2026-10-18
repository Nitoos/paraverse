import asyncio
import json
import os
import subprocess
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator, Optional

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.calibration import get_calibration
from backend.config import FRONTEND_PORT
from backend.database import get_engine, get_session, init_db
from backend.metrics import compute_metrics
from backend.models import Fix, Persona, Run, Step, Study, Variant


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Install Playwright chromium if needed
    try:
        result = subprocess.run(
            ["python3", "-m", "playwright", "install", "chromium"],
            capture_output=True, text=True, timeout=120,
        )
    except Exception:
        pass
    yield


app = FastAPI(title="Paraverse API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


# ── Studies ──────────────────────────────────────────────────────────────────

class VariantIn(BaseModel):
    url: str
    label: str
    notes: str = ""


class StudyIn(BaseModel):
    name: str
    task: str
    mode: str = "live"
    segment_mix: dict[str, int]
    variants: list[VariantIn]


@app.post("/api/studies")
def create_study(payload: StudyIn, session: Session = Depends(get_session)):
    study = Study(
        name=payload.name,
        task=payload.task,
        mode=payload.mode,
        segment_mix=json.dumps(payload.segment_mix),
    )
    session.add(study)
    session.commit()
    session.refresh(study)

    created_variants = []
    for v in payload.variants:
        variant = Variant(study_id=study.id, url=v.url, label=v.label, notes=v.notes)
        session.add(variant)
        created_variants.append(variant)
    session.commit()
    for v in created_variants:
        session.refresh(v)
    return {
        "id": study.id,
        "name": study.name,
        "task": study.task,
        "mode": study.mode,
        "status": study.status,
        "variants": [{"id": v.id, "name": v.label, "url": v.url} for v in created_variants],
    }


@app.get("/api/studies")
def list_studies(session: Session = Depends(get_session)):
    return session.exec(select(Study).order_by(Study.created.desc())).all()


@app.get("/api/studies/{study_id}")
def get_study(study_id: str, session: Session = Depends(get_session)):
    study = session.get(Study, study_id)
    if not study:
        raise HTTPException(404, "Study not found")
    return study


@app.get("/api/studies/{study_id}/variants")
def get_variants(study_id: str, session: Session = Depends(get_session)):
    return session.exec(select(Variant).where(Variant.study_id == study_id)).all()


# ── Personas ─────────────────────────────────────────────────────────────────

class PersonaMixIn(BaseModel):
    segment_mix: dict[str, int]


@app.post("/api/studies/{study_id}/personas")
async def generate_personas_endpoint(
    study_id: str,
    payload: PersonaMixIn,
    session: Session = Depends(get_session),
):
    study = session.get(Study, study_id)
    if not study:
        raise HTTPException(404, "Study not found")

    from backend.persona_generator import generate_personas
    personas = await generate_personas(study_id, payload.segment_mix)
    return personas


# ── SSE helpers ───────────────────────────────────────────────────────────────

async def _stream_queue(queue: asyncio.Queue) -> AsyncGenerator[str, None]:
    while True:
        try:
            event = await asyncio.wait_for(queue.get(), timeout=15.0)
        except asyncio.TimeoutError:
            yield ": keepalive\n\n"
            continue
        yield f"data: {json.dumps(event)}\n\n"
        if event.get("type") == "run_complete":
            break


# ── Live run + SSE stream ─────────────────────────────────────────────────────

@app.post("/api/studies/{study_id}/run")
async def start_run(study_id: str, session: Session = Depends(get_session)):
    study = session.get(Study, study_id)
    if not study:
        raise HTTPException(404, "Study not found")

    segment_mix = json.loads(study.segment_mix)

    # Generate personas if none exist
    existing = session.exec(select(Persona).where(Persona.study_id == study_id)).first()
    if not existing:
        from backend.persona_generator import generate_personas
        await generate_personas(study_id, segment_mix)

    return {"status": "started", "study_id": study_id}


@app.get("/api/studies/{study_id}/stream")
async def stream_study(study_id: str, session: Session = Depends(get_session)):
    study = session.get(Study, study_id)
    if not study:
        raise HTTPException(404, "Study not found")

    # Snapshot before session closes
    segment_mix_str = study.segment_mix
    task_goal = study.task

    queue: asyncio.Queue = asyncio.Queue()

    async def run_and_stream():
        from backend.persona_generator import generate_personas
        from backend.swarm_runner import run_study
        from sqlmodel import Session as S
        with S(get_engine()) as bg_session:
            existing = bg_session.exec(select(Persona).where(Persona.study_id == study_id)).first()
        if not existing:
            await generate_personas(study_id, json.loads(segment_mix_str))
        await queue.put({"type": "run_starting", "study_id": study_id})
        await run_study(study_id, queue, task_goal)

    asyncio.create_task(run_and_stream())
    return StreamingResponse(
        _stream_queue(queue),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/studies/{study_id}/replay")
async def replay_study_endpoint(study_id: str, session: Session = Depends(get_session)):
    study = session.get(Study, study_id)
    if not study:
        raise HTTPException(404, "Study not found")

    queue: asyncio.Queue = asyncio.Queue()

    async def replay_and_stream():
        try:
            from backend.swarm_runner import replay_study
            await replay_study(study_id, queue)
        except Exception as exc:
            await queue.put({"type": "error", "message": str(exc)})
            await queue.put({"type": "run_complete", "study_id": study_id, "total_agents": 0})

    asyncio.create_task(replay_and_stream())
    return StreamingResponse(_stream_queue(queue), media_type="text/event-stream")


# ── Metrics ────────────────────────────────────────────────────────────────────

@app.get("/api/studies/{study_id}/metrics")
def get_metrics(
    study_id: str,
    n_employees: int = 20000,
    freq_per_year: int = 12,
    session: Session = Depends(get_session),
):
    study = session.get(Study, study_id)
    if not study:
        raise HTTPException(404, "Study not found")
    metrics = compute_metrics(study_id, session, n_employees, freq_per_year)
    return {
        "completion_rate": metrics.completion_rate,
        "avg_time_on_task": metrics.avg_time_on_task,
        "drop_off_step": metrics.drop_off_step,
        "confusion_rate": metrics.confusion_rate,
        "extra_minutes_vs_baseline": metrics.extra_minutes_vs_baseline,
        "hours_lost_per_year": metrics.hours_lost_per_year,
        "support_tickets_avoided": metrics.support_tickets_avoided,
        "by_variant": [
            {
                "variant_id": v.variant_id,
                "variant_label": v.variant_label,
                "completion_rate": v.completion_rate,
                "avg_time_on_task": v.avg_time_on_task,
                "drop_off_step": v.drop_off_step,
                "confusion_rate": v.confusion_rate,
                "funnel": v.funnel,
            }
            for v in metrics.by_variant
        ],
        "by_segment": {
            seg: {
                "variant_id": m.variant_id,
                "variant_label": m.variant_label,
                "completion_rate": m.completion_rate,
                "avg_time_on_task": m.avg_time_on_task,
                "drop_off_step": m.drop_off_step,
                "confusion_rate": m.confusion_rate,
                "funnel": m.funnel,
            }
            for seg, m in metrics.by_segment.items()
        },
    }


# ── Fixes ───────────────────────────────────────────────────────────────────────

class FixRequest(BaseModel):
    variant_id: str


@app.post("/api/studies/{study_id}/fixes")
async def generate_fixes(
    study_id: str,
    payload: FixRequest,
    session: Session = Depends(get_session),
):
    from backend.fix_suggester import suggest_fixes
    fixes = await suggest_fixes(study_id, payload.variant_id, session)
    return fixes


@app.get("/api/studies/{study_id}/fixes")
def list_fixes(study_id: str, session: Session = Depends(get_session)):
    return session.exec(
        select(Fix).where(Fix.study_id == study_id).order_by(Fix.rank)
    ).all()


# ── Calibration ─────────────────────────────────────────────────────────────────

@app.get("/api/calibration")
def calibration():
    result = get_calibration()
    return {
        "uncalibrated_accuracy": result.uncalibrated_accuracy,
        "calibrated_tuning_accuracy": result.calibrated_tuning_accuracy,
        "calibrated_holdout_accuracy": result.calibrated_holdout_accuracy,
        "total_rollouts": result.total_rollouts,
        "holdout_count": result.holdout_count,
        "optimal_weights": result.optimal_weights,
        "disclaimer": result.disclaimer,
    }


# ── Screenshots ─────────────────────────────────────────────────────────────────

@app.get("/api/screenshots/{path:path}")
def serve_screenshot(path: str):
    full_path = Path("data/screenshots") / path
    if not full_path.exists():
        raise HTTPException(404, "Screenshot not found")
    return FileResponse(str(full_path))


# ── Serve React frontend (production) ────────────────────────────────────────
_FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
if _FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(_FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        return FileResponse(str(_FRONTEND_DIST / "index.html"))
