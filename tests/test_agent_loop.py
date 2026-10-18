import asyncio
import json

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from backend.agent_loop import compute_human_time


def test_compute_human_time_new_hire_click():
    # click=5 * new_hire=1.5 = 7.5
    assert compute_human_time("click", "new_hire") == pytest.approx(7.5)


def test_compute_human_time_power_user_type():
    # type=20 * power_user=0.7 = 14.0
    assert compute_human_time("type", "power_user") == pytest.approx(14.0)


def test_compute_human_time_frontline_scroll():
    # scroll=3 * frontline_mobile=1.3 = 3.9
    assert compute_human_time("scroll", "frontline_mobile") == pytest.approx(3.9)


def _make_persona():
    p = MagicMock()
    p.id = "p_test"
    p.segment = "new_hire"
    p.device = "desktop_800"
    p.patience_budget_steps = 10
    p.patience_budget_seconds = 300
    p.behavioral_rules = "[]"
    return p


@pytest.mark.asyncio
async def test_invalid_target_id_logs_error_and_stops():
    fake_action = json.dumps({
        "thought": "I see a button",
        "confused": False,
        "confusion_reason": "",
        "action": "click",
        "target_id": "el_NONEXISTENT",
        "value": None,
        "confidence": 0.9,
    })

    persona = _make_persona()
    queue = asyncio.Queue()

    with patch("backend.agent_loop._gemini_step", new_callable=AsyncMock, return_value=fake_action), \
         patch("backend.agent_loop._save_screenshot", return_value="data/screenshots/test/step_000.jpg"), \
         patch("backend.agent_loop.Session"), \
         patch("backend.agent_loop.get_engine"), \
         patch("backend.agent_loop._launch_browser") as mock_browser:

        page = AsyncMock()
        page.goto = AsyncMock()
        page.screenshot = AsyncMock(return_value=b"fake_png_data")
        page.evaluate = AsyncMock(return_value=[
            {"id": "el_1", "tag": "button", "text": "Next", "role": "button", "visible": True}
        ])

        cm = AsyncMock()
        cm.__aenter__ = AsyncMock(return_value=page)
        cm.__aexit__ = AsyncMock(return_value=None)
        mock_browser.return_value = cm

        from backend.agent_loop import run_agent
        outcome = await run_agent("run_1", persona, "http://localhost:3001/baseline/", "submit expense", queue)

    assert outcome == "error"


@pytest.mark.asyncio
async def test_patience_budget_exhaustion_produces_abandoned():
    # Agent keeps clicking a valid element but never reaches goal_reached
    fake_action = json.dumps({
        "thought": "trying",
        "confused": False,
        "confusion_reason": "",
        "action": "click",
        "target_id": "el_1",
        "value": None,
        "confidence": 0.5,
    })

    persona = _make_persona()
    persona.patience_budget_steps = 2  # very low
    persona.segment = "frontline_mobile"
    queue = asyncio.Queue()

    with patch("backend.agent_loop._gemini_step", new_callable=AsyncMock, return_value=fake_action), \
         patch("backend.agent_loop._save_screenshot", return_value="data/screenshots/test/step_000.jpg"), \
         patch("backend.agent_loop.Session"), \
         patch("backend.agent_loop.get_engine"), \
         patch("backend.agent_loop._launch_browser") as mock_browser:

        page = AsyncMock()
        page.goto = AsyncMock()
        page.screenshot = AsyncMock(return_value=b"fake_png_data")
        page.evaluate = AsyncMock(return_value=[
            {"id": "el_1", "tag": "button", "text": "Next", "role": "button", "visible": True}
        ])
        page.click = AsyncMock()

        cm = AsyncMock()
        cm.__aenter__ = AsyncMock(return_value=page)
        cm.__aexit__ = AsyncMock(return_value=None)
        mock_browser.return_value = cm

        from backend.agent_loop import run_agent
        outcome = await run_agent("run_2", persona, "http://localhost:3001/baseline/", "submit expense", queue)

    assert outcome == "abandoned"
