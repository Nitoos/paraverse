import asyncio
import json
from datetime import datetime, timezone

from sqlmodel import Session, select

from backend.agent_loop import run_agent
from backend.config import GEMINI_RPM
from backend.database import get_engine
from backend.models import Persona, Run, Step, Study, Variant

MAX_PARALLEL = min(GEMINI_RPM, 2)


async def run_study(study_id: str, sse_queue: asyncio.Queue, task_goal: str = "") -> None:
    with Session(get_engine()) as session:
        study = session.get(Study, study_id)
        if not study:
            await sse_queue.put({"type": "error", "message": "Study not found"})
            return

        if not task_goal:
            task_goal = study.task

        variants = session.exec(select(Variant).where(Variant.study_id == study_id)).all()
        personas = session.exec(select(Persona).where(Persona.study_id == study_id)).all()

        # Create run records — collect plain string IDs before session closes
        runs_to_execute: list[tuple[str, Persona, str]] = []  # (run_id, persona, url)
        for variant in variants:
            for persona in personas:
                run = Run(
                    study_id=study_id,
                    variant_id=variant.id,
                    persona_id=persona.id,
                    started_at=datetime.now(timezone.utc),
                )
                session.add(run)
                runs_to_execute.append((run, persona, variant.url))
        session.commit()
        # Refresh runs to get DB IDs; snapshot personas as detached copies
        runs_snapshot: list[tuple[str, Persona, str]] = []
        for run, persona, url in runs_to_execute:
            session.refresh(run)
            # Create a detached copy with all fields loaded while session is open
            p = Persona(
                id=persona.id,
                study_id=persona.study_id,
                segment=persona.segment,
                tenure_years=persona.tenure_years,
                tech_literacy=persona.tech_literacy,
                language_fluency=persona.language_fluency,
                device=persona.device,
                patience_budget_steps=persona.patience_budget_steps,
                patience_budget_seconds=persona.patience_budget_seconds,
                accessibility_needs=persona.accessibility_needs,
                behavioral_rules=persona.behavioral_rules,
            )
            runs_snapshot.append((str(run.id), p, url))

        # Update study status
        study.status = "running"
        session.add(study)
        session.commit()

    total = len(runs_snapshot)
    completed_count = 0
    semaphore = asyncio.Semaphore(MAX_PARALLEL)

    async def execute_run(run_id: str, persona: Persona, url: str):
        nonlocal completed_count
        async with semaphore:
            outcome = await run_agent(run_id, persona, url, task_goal, sse_queue)
            with Session(get_engine()) as session:
                db_run = session.get(Run, run_id)
                if db_run:
                    db_run.outcome = outcome
                    db_run.completed_at = datetime.now(timezone.utc)
                    session.add(db_run)
                    session.commit()
            completed_count += 1
            await sse_queue.put({
                "type": "progress",
                "completed": completed_count,
                "total": total,
            })

    tasks = [execute_run(run_id, persona, url) for run_id, persona, url in runs_snapshot]
    await asyncio.gather(*tasks)

    with Session(get_engine()) as session:
        study = session.get(Study, study_id)
        if study:
            study.status = "completed"
            session.add(study)
            session.commit()

    await sse_queue.put({
        "type": "run_complete",
        "study_id": study_id,
        "total_agents": total,
    })


async def replay_study(study_id: str, sse_queue: asyncio.Queue) -> None:
    with Session(get_engine()) as session:
        runs = session.exec(
            select(Run).where(Run.study_id == study_id).order_by(Run.started_at)
        ).all()

        # Load personas for segment names
        persona_map: dict[str, Persona] = {}
        for run in runs:
            p = session.get(Persona, run.persona_id)
            if p:
                persona_map[run.persona_id] = p

        # Group steps by run, interleave across runs for visual effect
        run_steps: dict[str, list[Step]] = {}
        for run in runs:
            steps = session.exec(
                select(Step).where(Step.run_id == run.id).order_by(Step.index)
            ).all()
            run_steps[run.id] = list(steps)

    total = len(runs)
    await sse_queue.put({"type": "run_starting", "study_id": study_id})

    # Interleave steps: emit step 0 for all runs, then step 1, etc.
    # Use run.id as agent_id so each run gets its own tile (personas may be reused across runs)
    max_steps = max((len(s) for s in run_steps.values()), default=0)
    terminal_emitted: set[str] = set()
    for step_idx in range(max_steps):
        for run in runs:
            run_id = str(run.id)
            steps = run_steps.get(run.id, [])
            persona = persona_map.get(run.persona_id)
            if step_idx < len(steps):
                step = steps[step_idx]
                await sse_queue.put({
                    "type": "step",
                    "agent_id": run_id,
                    "persona_segment": persona.segment if persona else "unknown",
                    "step_index": step.index,
                    "action": step.action,
                    "thought": step.thought,
                    "confused": step.confused,
                    "status": "replaying",
                    "screenshot_path": None,  # no real screenshots in demo data
                })
            elif step_idx == len(steps) and run_id not in terminal_emitted:
                # Emit terminal on the step after this run's last step
                terminal_emitted.add(run_id)
                await sse_queue.put({
                    "type": "terminal",
                    "agent_id": run_id,
                    "persona_segment": persona.segment if persona else "unknown",
                    "outcome": run.outcome or "unknown",
                    "total_steps": len(steps),
                })
        await asyncio.sleep(0.5)  # 0.5s between rounds so tiles fill in visually

    # Emit remaining terminal events for runs that finished at the last step
    for run in runs:
        run_id = str(run.id)
        if run_id not in terminal_emitted:
            persona = persona_map.get(run.persona_id)
            await sse_queue.put({
                "type": "terminal",
                "agent_id": run_id,
                "persona_segment": persona.segment if persona else "unknown",
                "outcome": run.outcome or "unknown",
                "total_steps": len(run_steps.get(run.id, [])),
            })

    await sse_queue.put({
        "type": "run_complete",
        "study_id": study_id,
        "total_agents": total,
    })
