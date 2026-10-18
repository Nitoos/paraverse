import asyncio
import json
import re
from contextlib import asynccontextmanager
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Optional

from google import genai
from PIL import Image
from playwright.async_api import async_playwright

from backend.config import (
    AGENT_MODEL, GEMINI_API_KEY, SCREENSHOTS_DIR,
    SEGMENT_MULTIPLIER, STEP_CAP, TIME_COST_SECONDS,
)
from backend.database import get_engine
from backend.models import Persona, Run, Step
from backend.rate_limiter import bucket, with_backoff
from sqlmodel import Session

_client = None

def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client

VIEWPORT_DESKTOP = {"width": 800, "height": 600}
VIEWPORT_MOBILE = {"width": 375, "height": 667}

EXTRACT_ELEMENTS_JS = """
() => {
  const selectors = 'a[id], button[id], input[id], select[id], textarea[id], [id][role]';
  return Array.from(document.querySelectorAll(selectors)).map(el => ({
    id: el.id,
    tag: el.tagName.toLowerCase(),
    text: (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || '').trim().slice(0, 80),
    role: el.getAttribute('role') || el.tagName.toLowerCase(),
    visible: el.offsetParent !== null && el.offsetWidth > 0,
  }));
}
"""

VALID_ACTIONS = {"click", "type", "scroll", "wait", "give_up", "goal_reached"}


def compute_human_time(action: str, segment: str) -> float:
    base = TIME_COST_SECONDS.get(action, 2.0)
    multiplier = SEGMENT_MULTIPLIER.get(segment, 1.0)
    return base * multiplier


def extract_action(raw: str) -> dict:
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    data = json.loads(text)

    required = ["thought", "confused", "action"]
    for f in required:
        if f not in data:
            raise ValueError(f"Missing field: {f}")
    if data["action"] not in VALID_ACTIONS:
        raise ValueError(f"Unknown action: {data['action']}")

    return {
        "thought": str(data.get("thought", "")),
        "confused": bool(data.get("confused", False)),
        "confusion_reason": str(data.get("confusion_reason", "")),
        "action": data["action"],
        "target_id": data.get("target_id"),
        "value": data.get("value"),
        "confidence": float(data.get("confidence", 1.0)),
    }


@asynccontextmanager
async def _launch_browser(device: str):
    viewport = VIEWPORT_MOBILE if device == "mobile_375" else VIEWPORT_DESKTOP
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport=viewport)
        page = await context.new_page()
        try:
            yield page
        finally:
            await browser.close()


async def _gemini_step(prompt: str, screenshot_bytes: bytes) -> str:
    from google.genai import types
    await bucket.acquire()

    async def _call():
        response = await _get_client().aio.models.generate_content(
            model=AGENT_MODEL,
            contents=[
                types.Part.from_bytes(data=screenshot_bytes, mime_type="image/jpeg"),
                prompt,
            ],
        )
        return response.text

    return await with_backoff(_call)


def _save_screenshot(run_id: str, step_index: int, data: bytes) -> str:
    run_dir = SCREENSHOTS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    path = run_dir / f"step_{step_index:03d}.jpg"
    img = Image.open(BytesIO(data))
    img = img.convert("RGB")
    img.save(str(path), "JPEG", quality=60)
    return str(path)


def _build_prompt(
    persona: Persona,
    task_goal: str,
    elements: list[dict],
    history: list[dict],
) -> str:
    rules = json.loads(persona.behavioral_rules)
    rules_text = "\n".join(f"- {r}" for r in rules)
    elements_text = json.dumps(elements[:30], ensure_ascii=False)
    history_text = json.dumps(history[-3:], ensure_ascii=False) if history else "[]"

    return f"""You are a synthetic employee operating a web UI. Act as a real person with these traits:
- Segment: {persona.segment}
- Tenure: {persona.tenure_years} years
- Tech literacy (1-5): {persona.tech_literacy}
- Language fluency (1-5): {persona.language_fluency}
- Device: {persona.device}

Behavioral rules (follow these strictly):
{rules_text}

Your task: {task_goal}

Recent history (last 3 steps): {history_text}

Visible interactive elements (you may ONLY act on elements in this list):
{elements_text}

Respond with ONLY a JSON object, no markdown:
{{
  "thought": "your internal monologue",
  "confused": true or false,
  "confusion_reason": "why confused, or empty string",
  "action": "click | type | scroll | wait | give_up | goal_reached",
  "target_id": "element id from the list above, or null",
  "value": "text to type, or null",
  "confidence": 0.0 to 1.0
}}

IMPORTANT: target_id must be an id from the element list above. If you cannot find a suitable element, use give_up."""


async def run_agent(
    run_id: str,
    persona: Persona,
    variant_url: str,
    task_goal: str,
    sse_queue: asyncio.Queue,
) -> str:
    max_steps = min(persona.patience_budget_steps, STEP_CAP)
    history: list[dict] = []
    outcome = "step_cap"

    async with _launch_browser(persona.device) as page:
        try:
            await page.goto(variant_url, wait_until="domcontentloaded", timeout=15000)
        except Exception as e:
            outcome = "error"
            await sse_queue.put({
                "type": "terminal",
                "agent_id": persona.id,
                "outcome": outcome,
                "total_steps": 0,
            })
            return outcome

        for step_index in range(max_steps):
            # Capture screenshot
            raw_shot = await page.screenshot()
            screenshot_path = _save_screenshot(run_id, step_index, raw_shot)

            # Extract elements
            elements: list[dict] = await page.evaluate(EXTRACT_ELEMENTS_JS)
            element_ids = {e["id"] for e in elements}

            # Build prompt and call Gemini
            prompt = _build_prompt(persona, task_goal, elements, history)
            try:
                raw_response = await _gemini_step(prompt, raw_shot)
                action_data = extract_action(raw_response)
            except Exception as e:
                action_data = {
                    "thought": f"Error: {e}",
                    "confused": True,
                    "confusion_reason": "parse_error",
                    "action": "give_up",
                    "target_id": None,
                    "value": None,
                    "confidence": 0.0,
                }

            # Review Focus: hallucinated target_id → error
            target_id = action_data.get("target_id")
            if target_id and target_id not in element_ids:
                action_data["action"] = "error"
                action_data["thought"] = f"Hallucinated element id: {target_id}"
                action_data["confused"] = True

            human_time = compute_human_time(action_data["action"], persona.segment)

            # Persist step
            step = Step(
                run_id=run_id,
                index=step_index,
                screenshot_path=screenshot_path,
                action=action_data["action"],
                target_id=target_id,
                value=action_data.get("value"),
                thought=action_data["thought"],
                confused=action_data["confused"],
                confusion_reason=action_data.get("confusion_reason", ""),
                confidence=action_data["confidence"],
                human_time_seconds=human_time,
            )
            with Session(get_engine()) as session:
                session.add(step)
                session.commit()

            # Stream to SSE
            await sse_queue.put({
                "type": "step",
                "agent_id": persona.id,
                "persona_segment": persona.segment,
                "step_index": step_index,
                "action": action_data["action"],
                "thought": action_data["thought"],
                "confused": action_data["confused"],
                "status": "running",
                "screenshot_path": screenshot_path,
            })

            history.append({
                "step": step_index,
                "action": action_data["action"],
                "thought": action_data["thought"],
            })

            # Check stop conditions
            act = action_data["action"]
            if act == "goal_reached":
                outcome = "completed"
                break
            elif act in ("give_up", "error"):
                outcome = "error" if act == "error" else "abandoned"
                break
            elif step_index == max_steps - 1:
                outcome = "step_cap"
                break

            # Execute action
            try:
                if act == "click" and target_id:
                    await page.click(f"#{target_id}", timeout=5000)
                elif act == "type" and target_id and action_data.get("value"):
                    await page.fill(f"#{target_id}", action_data["value"])
                elif act == "scroll":
                    await page.evaluate("window.scrollBy(0, 300)")
                elif act == "wait":
                    await asyncio.sleep(1)
            except Exception as e:
                history[-1]["action"] = "error"
                outcome = "error"
                break

        # Check patience budget
        if outcome == "step_cap" and step_index + 1 >= persona.patience_budget_steps:
            outcome = "abandoned"

    await sse_queue.put({
        "type": "terminal",
        "agent_id": persona.id,
        "outcome": outcome,
        "total_steps": step_index + 1 if "step_index" in dir() else 0,
    })
    return outcome
