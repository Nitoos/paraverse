import asyncio
import json
from datetime import datetime

from sqlmodel import Session, select

from backend.agent_loop import run_agent
from backend.config import GEMINI_RPM
from backend.database import get_engine
from backend.models import Persona, Run, Step, Study, Variant

MAX_PARALLEL = min(GEMINI_RPM, 5)


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

        # Create run records
        runs_to_execute: list[tuple[Run, Persona, str]] = []
        for variant in variants:
            for persona in personas:
                run = Run(
                    study_id=study_id,
                    variant_id=variant.id,
                    persona_id=persona.id,
                    started_at=datetime.utcnow(),
                )
                session.add(run)
                runs_to_execute.append((run, persona, variant.url))
        session.commit()
        for run, _, _ in runs_to_execute:
            session.refresh(run)

        # Update study status
        study.status = "running"
        session.add(study)
        session.commit()

    total = len(runs_to_execute)
    completed_count = 0
    semaphore = asyncio.Semaphore(MAX_PARALLEL)

    async def execute_run(run: Run, persona: Persona, url: str):
        nonlocal completed_count
        async with semaphore:
            outcome = await run_agent(run.id, persona, url, task_goal, sse_queue)
            with Session(get_engine()) as session:
                db_run = session.get(Run, run.id)
                if db_run:
                    db_run.outcome = outcome
                    db_run.completed_at = datetime.utcnow()
                    session.add(db_run)
                    session.commit()
            completed_count += 1
            await sse_queue.put({
                "type": "progress",
                "completed": completed_count,
                "total": total,
            })

    tasks = [execute_run(run, persona, url) for run, persona, url in runs_to_execute]
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

        all_steps: list[tuple[Run, Step]] = []
        for run in runs:
            steps = session.exec(
                select(Step).where(Step.run_id == run.id).order_by(Step.index)
            ).all()
            for step in steps:
                all_steps.append((run, step))

    total = len(runs)
    for run, step in all_steps:
        await sse_queue.put({
            "type": "step",
            "agent_id": run.persona_id,
            "persona_segment": "unknown",
            "step_index": step.index,
            "action": step.action,
            "thought": step.thought,
            "confused": step.confused,
            "status": "replaying",
            "screenshot_path": step.screenshot_path,
        })
        await asyncio.sleep(0.1)

    for run in runs:
        await sse_queue.put({
            "type": "terminal",
            "agent_id": run.persona_id,
            "outcome": run.outcome or "unknown",
            "total_steps": 0,
        })

    await sse_queue.put({
        "type": "run_complete",
        "study_id": study_id,
        "total_agents": total,
    })
