"""Seed realistic demo data for the hackathon presentation."""
import json
import random
import uuid
from datetime import datetime, timezone, timedelta

from sqlmodel import Session, select

from backend.database import get_engine, init_db
from backend.models import Fix, Persona, Run, Step, Study, Variant


def _now(offset_seconds: float = 0) -> datetime:
    return datetime.now(timezone.utc) + timedelta(seconds=offset_seconds)


BASELINE_STEPS = [
    {"action": "type", "thought": "I see the Expense Title field. I'll type 'Team Lunch' to start filling out the form.", "confused": False, "target_id": "expense-title", "value": "Team Lunch"},
    {"action": "type", "thought": "Now I'll enter the amount. The label says 'Amount (USD)' so I'll type 50.", "confused": False, "target_id": "amount", "value": "50"},
    {"action": "click", "thought": "I see a dropdown for category. I'll select 'Meals & Entertainment'.", "confused": False, "target_id": "category"},
    {"action": "type", "thought": "The date field shows today's date placeholder. I'll fill in today's date.", "confused": False, "target_id": "date", "value": "2026-10-18"},
    {"action": "click", "thought": "I can see the 'Next' button clearly. Clicking to proceed to step 2.", "confused": False, "target_id": "btn-next"},
    {"action": "type", "thought": "Step 2 asks for a business justification. I'll write a brief note.", "confused": False, "target_id": "justification", "value": "Lunch with client"},
    {"action": "click", "thought": "I'll attach a receipt by clicking the upload button.", "confused": False, "target_id": "btn-upload"},
    {"action": "click", "thought": "Good, receipt uploaded. Now clicking 'Submit' to complete the report.", "confused": False, "target_id": "btn-submit"},
    {"action": "goal_reached", "thought": "The confirmation page shows 'Expense Submitted Successfully'. Task complete!", "confused": False, "target_id": None},
]

FLAWED_STEPS_EASY = [
    {"action": "type", "thought": "I see 'Exp. Title' — I'll type the expense name.", "confused": False, "target_id": "exp-title", "value": "Team Lunch"},
    {"action": "type", "thought": "The amount field is labeled 'Cost ($)'. I'll enter 50.", "confused": False, "target_id": "cost", "value": "50"},
    {"action": "scroll", "thought": "I need to find more fields. Scrolling down to see the rest of the form.", "confused": True, "target_id": None},
    {"action": "scroll", "thought": "Still scrolling — the page is very long and the category dropdown is hidden.", "confused": True, "target_id": None},
    {"action": "click", "thought": "Found the category dropdown after scrolling. It's labeled 'Type' which was confusing.", "confused": True, "target_id": "type-select"},
    {"action": "wait", "thought": "The page seems to have loaded something new. Waiting for the UI to settle.", "confused": True, "target_id": None},
    {"action": "give_up", "thought": "I've been on this page too long without finding the submit button. The UI is confusing and I'm not sure if my entries were saved. Giving up.", "confused": True, "target_id": None},
]

FLAWED_STEPS_HARD = [
    {"action": "scroll", "thought": "The page layout is very cluttered. I need to scroll to find the expense title field.", "confused": True, "target_id": None},
    {"action": "type", "thought": "Found 'Expense Name' field after scrolling. Entering the title.", "confused": False, "target_id": "exp-name", "value": "Lunch"},
    {"action": "scroll", "thought": "Looking for the amount field. The form has too many unlabeled inputs.", "confused": True, "target_id": None},
    {"action": "give_up", "thought": "I cannot find where to enter the dollar amount. The form has 4 similar text boxes with no clear labels. This UI is very confusing. Abandoning.", "confused": True, "target_id": None},
]

SEGMENTS = [
    ("Power User", 5.0, 4, 5, "desktop", 12, 300),
    ("New Hire", 0.5, 2, 5, "desktop", 8, 200),
    ("Non-Native Speaker", 2.0, 3, 2, "desktop", 10, 240),
    ("Frontline Mobile", 3.0, 3, 4, "mobile_375", 8, 180),
    ("Occasional User", 1.5, 2, 4, "desktop", 6, 160),
]

SEGMENT_RULES = {
    "Power User": ["Prefers keyboard shortcuts", "Skips reading labels if pattern matches experience", "Moves quickly between fields"],
    "New Hire": ["Reads every label carefully", "Hesitates before each click", "Re-reads instructions after each step"],
    "Non-Native Speaker": ["Re-reads labels multiple times", "Confused by abbreviations", "Prefers simple English labels"],
    "Frontline Mobile": ["Uses thumb navigation", "Prefers large tap targets", "Frustrated by small form fields"],
    "Occasional User": ["Doesn't remember the flow", "Looks for help text", "Takes longer to recognize UI patterns"],
}


def seed_persona(session: Session, study_id: str, segment_name: str, idx: int) -> Persona:
    tenure, lit, fluency, device, patience_steps, patience_secs = SEGMENTS[
        [s[0] for s in SEGMENTS].index(segment_name)
    ][1:]
    p = Persona(
        id=str(uuid.uuid4()),
        study_id=study_id,
        segment=segment_name,
        tenure_years=tenure,
        tech_literacy=lit,
        language_fluency=fluency,
        device=device,
        patience_budget_steps=patience_steps,
        patience_budget_seconds=patience_secs,
        accessibility_needs=None,
        behavioral_rules=json.dumps(SEGMENT_RULES.get(segment_name, ["Follow the form instructions"])),
    )
    session.add(p)
    return p


def seed_run(
    session: Session,
    study_id: str,
    variant_id: str,
    persona: Persona,
    steps_template: list[dict],
    time_multiplier: float = 1.0,
) -> Run:
    start = _now(-random.uniform(300, 600))
    run = Run(
        id=str(uuid.uuid4()),
        study_id=study_id,
        variant_id=variant_id,
        persona_id=persona.id,
        started_at=start,
    )
    session.add(run)
    session.flush()

    total_time = 0.0
    for i, tmpl in enumerate(steps_template):
        base_times = {"type": 20, "click": 5, "scroll": 4, "wait": 3, "give_up": 0, "goal_reached": 0}
        ht = base_times.get(tmpl["action"], 3) * time_multiplier + random.uniform(-1, 2)
        total_time += ht
        st = Step(
            id=str(uuid.uuid4()),
            run_id=run.id,
            index=i,
            screenshot_path=f"data/screenshots/{run.id}/step_{i:03d}.jpg",
            action=tmpl["action"],
            target_id=tmpl.get("target_id"),
            value=tmpl.get("value"),
            thought=tmpl["thought"],
            confused=tmpl["confused"],
            confusion_reason="ui_unclear" if tmpl["confused"] else "",
            confidence=0.4 if tmpl["confused"] else 0.85,
            human_time_seconds=ht,
        )
        session.add(st)

    run.outcome = "completed" if steps_template[-1]["action"] == "goal_reached" else "abandoned"
    run.completed_at = start + timedelta(seconds=total_time)
    session.add(run)
    return run


def seed_demo_study(session: Session) -> str:
    study = Study(
        id=str(uuid.uuid4()),
        name="Expense Report UX — Baseline vs Redesign",
        task="Submit an expense report for a $50 team lunch",
        mode="live",
        status="completed",
        segment_mix=json.dumps({
            "Power User": 3,
            "New Hire": 4,
            "Non-Native Speaker": 3,
            "Frontline Mobile": 3,
            "Occasional User": 3,
        }),
        created=_now(-700),
    )
    session.add(study)
    session.flush()

    baseline = Variant(id=str(uuid.uuid4()), study_id=study.id, label="Current UI", url="http://localhost:3001/baseline/", notes="Multi-step wizard form")
    flawed = Variant(id=str(uuid.uuid4()), study_id=study.id, label="Flawed Redesign", url="http://localhost:3001/flawed/", notes="Single-page cluttered layout")
    session.add(baseline)
    session.add(flawed)
    session.flush()

    segments_baseline = [
        ("Power User", BASELINE_STEPS, 0.7),
        ("Power User", BASELINE_STEPS, 0.7),
        ("Power User", BASELINE_STEPS, 0.75),
        ("New Hire", BASELINE_STEPS, 1.5),
        ("New Hire", BASELINE_STEPS[:-2] + [{"action": "give_up", "thought": "I'm unsure if the form saved. Giving up after step 7.", "confused": True, "target_id": None}], 1.4),
        ("New Hire", BASELINE_STEPS, 1.6),
        ("New Hire", BASELINE_STEPS, 1.5),
        ("Non-Native Speaker", BASELINE_STEPS, 1.8),
        ("Non-Native Speaker", BASELINE_STEPS[:-3] + [{"action": "give_up", "thought": "Labels 'Category' and 'Type' confusing. Not sure which to pick.", "confused": True, "target_id": None}], 1.9),
        ("Non-Native Speaker", BASELINE_STEPS, 1.7),
        ("Frontline Mobile", BASELINE_STEPS, 1.3),
        ("Frontline Mobile", BASELINE_STEPS, 1.35),
        ("Frontline Mobile", BASELINE_STEPS[:-1] + [{"action": "give_up", "thought": "Submit button is too small on mobile. Accidentally leaving the page.", "confused": True, "target_id": None}], 1.3),
        ("Occasional User", BASELINE_STEPS, 1.4),
        ("Occasional User", BASELINE_STEPS[:-3] + [{"action": "give_up", "thought": "I forgot what step 2 asks for. Going back but lost my step 1 data.", "confused": True, "target_id": None}], 1.5),
        ("Occasional User", BASELINE_STEPS, 1.45),
    ]

    segments_flawed = [
        ("Power User", FLAWED_STEPS_EASY, 0.8),
        ("Power User", FLAWED_STEPS_EASY, 0.85),
        ("Power User", FLAWED_STEPS_HARD, 0.9),
        ("New Hire", FLAWED_STEPS_HARD, 1.6),
        ("New Hire", FLAWED_STEPS_HARD, 1.7),
        ("New Hire", FLAWED_STEPS_HARD, 1.65),
        ("New Hire", FLAWED_STEPS_HARD, 1.8),
        ("Non-Native Speaker", FLAWED_STEPS_HARD, 2.1),
        ("Non-Native Speaker", FLAWED_STEPS_HARD, 2.0),
        ("Non-Native Speaker", FLAWED_STEPS_HARD, 2.2),
        ("Frontline Mobile", FLAWED_STEPS_HARD, 1.5),
        ("Frontline Mobile", FLAWED_STEPS_HARD, 1.55),
        ("Frontline Mobile", FLAWED_STEPS_EASY[:3] + [{"action": "give_up", "thought": "Page too complex on mobile screen. Can't find submit.", "confused": True, "target_id": None}], 1.4),
        ("Occasional User", FLAWED_STEPS_HARD, 1.6),
        ("Occasional User", FLAWED_STEPS_HARD, 1.7),
        ("Occasional User", FLAWED_STEPS_EASY, 1.5),
    ]

    # Create personas and runs
    persona_cache: dict[str, Persona] = {}

    for seg, steps, mult in segments_baseline:
        key = f"{seg}-{study.id}"
        if key not in persona_cache:
            persona_cache[key] = seed_persona(session, study.id, seg, len(persona_cache))
        seed_run(session, study.id, baseline.id, persona_cache[key], steps, mult)

    persona_cache2: dict[str, Persona] = {}
    for seg, steps, mult in segments_flawed:
        key = f"{seg}-{study.id}-f"
        if key not in persona_cache2:
            persona_cache2[key] = seed_persona(session, study.id, seg, len(persona_cache2))
        seed_run(session, study.id, flawed.id, persona_cache2[key], steps, mult)

    session.commit()
    return study.id


def seed_fixes(session: Session, study_id: str) -> None:
    fixes = [
        Fix(id=str(uuid.uuid4()), study_id=study_id, step_index=0, rank=1,
            suggestion="Add visible field labels with larger font (14px+). Replace abbreviations ('Exp. Title', 'Cost $') with full descriptive labels. New Hire and Non-Native Speaker segments spend 40% extra time deciphering truncated labels.",
            expected_impact="High: estimated 38% reduction in avg task time for new hire segment.",
            resimulated_result=None),
        Fix(id=str(uuid.uuid4()), study_id=study_id, step_index=2, rank=2,
            suggestion="Break single-page form into 3 clearly labeled steps with a progress indicator. A step wizard reduces scrolling, shows progress, and cuts drop-off at step 3 by 22%.",
            expected_impact="High: completion rate increases from 44% to 72% based on resimulation.",
            resimulated_result=None),
        Fix(id=str(uuid.uuid4()), study_id=study_id, step_index=6, rank=3,
            suggestion="Increase tap target size to 48px minimum height for mobile viewports. Frontline Mobile users miss the Submit button 31% of the time on 375px screens.",
            expected_impact="Medium: eliminates 31% error rate for Frontline Mobile segment.",
            resimulated_result=None),
        Fix(id=str(uuid.uuid4()), study_id=study_id, step_index=4, rank=4,
            suggestion="Rename 'Type' dropdown to 'Expense Category'. Non-Native Speaker agents confused 'Type' with the expense type vs. submission type in 60% of runs.",
            expected_impact="Medium: 60% reduction in confusion events for Non-Native Speaker segment.",
            resimulated_result=None),
    ]
    for fix in fixes:
        session.add(fix)
    session.commit()


if __name__ == "__main__":
    init_db()
    with Session(get_engine()) as session:
        # Check if demo study already exists
        from sqlmodel import select as sel
        existing = session.exec(sel(Study).where(Study.name == "Expense Report UX — Baseline vs Redesign")).first()
        if existing:
            print(f"Demo study already exists: {existing.id}")
            study_id = existing.id
        else:
            study_id = seed_demo_study(session)
            print(f"Created demo study: {study_id}")

        # Get the flawed variant
        variants = session.exec(sel(Variant).where(Variant.study_id == study_id)).all()
        flawed_variant = next((v for v in variants if "Flawed" in v.label), None)
        existing_fixes = session.exec(sel(Fix).where(Fix.study_id == study_id)).all()
        if not existing_fixes:
            seed_fixes(session, study_id)
            print("Seeded fixes")

    print(f"\nDemo study ID: {study_id}")
    print("Open the frontend at http://localhost:3000")
    print("Create a new study pointing to http://localhost:3001/baseline/ and http://localhost:3001/flawed/")
    print(f"Or view existing study metrics at: http://localhost:8000/api/studies/{study_id}/metrics")
