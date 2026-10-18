import json
import re
from typing import Any

from google import genai
from sqlmodel import Session

from backend.config import GEMINI_API_KEY, TEXT_MODEL
from backend.database import get_engine, get_session
from backend.models import Persona
from backend.rate_limiter import bucket, with_backoff

_client = None

def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client

MOBILE_SEGMENTS = {"frontline_mobile", "low_vision"}

SEGMENT_DEFAULTS: dict[str, dict] = {
    "new_hire": {
        "tenure_years": 0.5, "tech_literacy": 3, "language_fluency": 5,
        "patience_budget_steps": 10, "patience_budget_seconds": 180,
        "behavioral_rules": [
            "Read every label carefully before clicking.",
            "If a label uses an acronym you were not told, treat it as unclear.",
            "Ask for help mentally if stuck for more than 3 steps.",
        ],
    },
    "power_user": {
        "tenure_years": 5.0, "tech_literacy": 5, "language_fluency": 5,
        "patience_budget_steps": 12, "patience_budget_seconds": 60,
        "behavioral_rules": [
            "Skip instructions and go directly to action.",
            "Try to complete the task as fast as possible.",
            "If a button is present, click it immediately.",
        ],
    },
    "non_native": {
        "tenure_years": 2.0, "tech_literacy": 3, "language_fluency": 2,
        "patience_budget_steps": 10, "patience_budget_seconds": 240,
        "behavioral_rules": [
            "Read copy slowly; idioms and abbreviations may be unclear.",
            "If a label has more than 4 words, re-read it before acting.",
            "If an acronym appears without explanation, treat it as very confusing.",
        ],
    },
    "frontline_mobile": {
        "tenure_years": 1.0, "tech_literacy": 2, "language_fluency": 4,
        "patience_budget_steps": 8, "patience_budget_seconds": 120,
        "behavioral_rules": [
            "Prefer tapping the first visible button rather than reading all options.",
            "If you cannot see the submit button without scrolling, assume the form is broken.",
            "If you cannot complete a step in 3 attempts, give up.",
        ],
    },
    "low_vision": {
        "tenure_years": 3.0, "tech_literacy": 3, "language_fluency": 5,
        "patience_budget_steps": 12, "patience_budget_seconds": 300,
        "behavioral_rules": [
            "Navigate using keyboard only; do not click.",
            "If a form field has no visible label, treat it as inaccessible.",
            "Report any element that is not keyboard-focusable as a blocker.",
        ],
    },
    "occasional": {
        "tenure_years": 2.0, "tech_literacy": 3, "language_fluency": 4,
        "patience_budget_steps": 8, "patience_budget_seconds": 150,
        "behavioral_rules": [
            "You forget steps from last time; rely entirely on what you can see.",
            "If a recovery path is not obvious, you may give up.",
            "Read error messages but often misinterpret them.",
        ],
    },
}


async def _call_gemini(segment: str, index: int) -> str:
    defaults = SEGMENT_DEFAULTS.get(segment, SEGMENT_DEFAULTS["new_hire"])
    device = "mobile_375" if segment in MOBILE_SEGMENTS else "desktop_800"

    prompt = f"""Generate a synthetic employee persona as strict JSON for a usability simulation.
Segment: {segment}
Index: {index}

Return ONLY this JSON, no markdown, no explanation:
{{
  "tenure_years": {defaults["tenure_years"]},
  "tech_literacy": {defaults["tech_literacy"]},
  "language_fluency": {defaults["language_fluency"]},
  "device": "{device}",
  "patience_budget_steps": {defaults["patience_budget_steps"]},
  "patience_budget_seconds": {defaults["patience_budget_seconds"]},
  "accessibility_needs": [],
  "behavioral_rules": {json.dumps(defaults["behavioral_rules"])}
}}

Add small realistic variation (±0.5 on tenure, ±1 on literacy/fluency) but keep device and patience budget exact."""

    await bucket.acquire()

    client = _get_client()

    async def _call():
        response = await client.aio.models.generate_content(
            model=TEXT_MODEL,
            contents=prompt,
        )
        return response.text

    return await with_backoff(_call)


def _parse_persona_json(raw: str, study_id: str, segment: str, index: int) -> Persona:
    # Strip markdown code fences if present
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    data = json.loads(text)
    device = "mobile_375" if segment in MOBILE_SEGMENTS else "desktop_800"
    data["device"] = device  # enforce device by segment

    required = ["tenure_years", "tech_literacy", "language_fluency", "device",
                "patience_budget_steps", "patience_budget_seconds",
                "accessibility_needs", "behavioral_rules"]
    for field in required:
        if field not in data:
            raise ValueError(f"Missing field in persona JSON: {field}")

    return Persona(
        study_id=study_id,
        segment=segment,
        tenure_years=float(data["tenure_years"]),
        tech_literacy=int(data["tech_literacy"]),
        language_fluency=int(data["language_fluency"]),
        device=data["device"],
        patience_budget_steps=int(data["patience_budget_steps"]),
        patience_budget_seconds=int(data["patience_budget_seconds"]),
        accessibility_needs=json.dumps(data.get("accessibility_needs", [])),
        behavioral_rules=json.dumps(data.get("behavioral_rules", [])),
    )


import random as _random


def _make_persona(study_id: str, segment: str) -> Persona:
    """Build a persona from templates with small random variation — no Gemini call needed."""
    seg_key = segment.lower().replace(" ", "_").replace("-", "_")
    defaults = SEGMENT_DEFAULTS.get(seg_key, SEGMENT_DEFAULTS["new_hire"])
    device = "mobile_375" if seg_key in MOBILE_SEGMENTS else "desktop_800"
    return Persona(
        study_id=study_id,
        segment=segment,
        tenure_years=max(0.1, defaults["tenure_years"] + _random.uniform(-0.5, 0.5)),
        tech_literacy=max(1, min(5, defaults["tech_literacy"] + _random.randint(-1, 1))),
        language_fluency=max(1, min(5, defaults["language_fluency"] + _random.randint(-1, 1))),
        device=device,
        patience_budget_steps=defaults["patience_budget_steps"],
        patience_budget_seconds=defaults["patience_budget_seconds"],
        accessibility_needs="[]",
        behavioral_rules=json.dumps(defaults["behavioral_rules"]),
    )


async def generate_personas(study_id: str, segment_mix: dict[str, int]) -> list[Persona]:
    personas: list[Persona] = []
    for segment, count in segment_mix.items():
        for _ in range(count):
            personas.append(_make_persona(study_id, segment))

    with Session(get_engine()) as session:
        for p in personas:
            session.add(p)
        session.commit()
        for p in personas:
            session.refresh(p)

    return personas
