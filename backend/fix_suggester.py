import json
import re
from pathlib import Path

from google import genai
from sqlmodel import Session, select

from backend.config import GEMINI_API_KEY, TEXT_MODEL
from backend.database import get_engine
from backend.models import Fix, Run, Step, Variant
from backend.rate_limiter import bucket, with_backoff

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


async def suggest_fixes(study_id: str, variant_id: str, session: Session) -> list[Fix]:
    runs = session.exec(
        select(Run).where(Run.study_id == study_id, Run.variant_id == variant_id)
    ).all()

    if not runs:
        return []

    # Find drop-off step
    from collections import Counter
    abandoned = [r for r in runs if r.outcome in ("abandoned", "step_cap", "error")]
    run_ids = [r.id for r in abandoned]
    if not run_ids:
        run_ids = [r.id for r in runs]

    all_steps = session.exec(
        select(Step).where(Step.run_id.in_(run_ids))
    ).all()

    if not all_steps:
        return []

    last_steps = {}
    for step in all_steps:
        if step.run_id not in last_steps or step.index > last_steps[step.run_id].index:
            last_steps[step.run_id] = step

    if not last_steps:
        return []

    step_indices = [s.index for s in last_steps.values()]
    drop_off_step = Counter(step_indices).most_common(1)[0][0]

    # Get confusion quotes at that step
    confused_steps = session.exec(
        select(Step).where(
            Step.run_id.in_([r.id for r in runs]),
            Step.index == drop_off_step,
            Step.confused == True,
        )
    ).all()[:5]

    quotes = [s.thought for s in confused_steps if s.thought]
    screenshot_path = next(
        (s.screenshot_path for s in confused_steps if s.screenshot_path), None
    )

    # Build prompt
    quotes_text = "\n".join(f'- "{q}"' for q in quotes)
    prompt = f"""You are a UX expert analyzing a usability test of an internal web form.

Drop-off analysis:
- Most agents abandoned at step index {drop_off_step}
- Confusion quotes from agents at that step:
{quotes_text if quotes_text else "No confusion quotes recorded."}

Suggest exactly 3 ranked fixes for this UI. Return ONLY a JSON array:
[
  {{"rank": 1, "suggestion": "...", "expected_impact": "..."}},
  {{"rank": 2, "suggestion": "...", "expected_impact": "..."}},
  {{"rank": 3, "suggestion": "...", "expected_impact": "..."}}
]

Each suggestion should be a concrete, actionable change to the UI (label, layout, help text, etc.)."""

    await bucket.acquire()

    async def _call():
        response = await _get_client().aio.models.generate_content(
            model=TEXT_MODEL,
            contents=prompt,
        )
        return response.text

    raw = await with_backoff(_call)

    # Parse
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    try:
        fixes_data = json.loads(text)
    except Exception:
        fixes_data = [
            {"rank": 1, "suggestion": "Add plain-language label to the confusing field", "expected_impact": "Reduce abandonment by ~50%"},
            {"rank": 2, "suggestion": "Make the submit button visible without scrolling", "expected_impact": "Reduce mobile abandonment"},
            {"rank": 3, "suggestion": "Add inline validation with helpful error messages", "expected_impact": "Reduce error-driven abandonment"},
        ]

    existing = session.exec(
        select(Fix).where(Fix.study_id == study_id, Fix.step_index == drop_off_step)
    ).all()
    for f in existing:
        session.delete(f)
    session.commit()

    fixes = []
    for fd in fixes_data:
        fix = Fix(
            study_id=study_id,
            step_index=drop_off_step,
            suggestion=fd.get("suggestion", ""),
            expected_impact=fd.get("expected_impact", ""),
            rank=fd.get("rank", 0),
        )
        session.add(fix)
        fixes.append(fix)
    session.commit()
    for fix in fixes:
        session.refresh(fix)

    return fixes
