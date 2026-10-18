import asyncio
from unittest.mock import MagicMock, patch, AsyncMock

import pytest


@pytest.mark.asyncio
async def test_replay_study_makes_no_gemini_calls(monkeypatch):
    gemini_called = False

    async def spy_gemini(*a, **kw):
        nonlocal gemini_called
        gemini_called = True
        return "{}"

    monkeypatch.setattr("backend.agent_loop._gemini_step", spy_gemini)

    queue = asyncio.Queue()

    mock_run = MagicMock()
    mock_run.id = "r1"
    mock_run.persona_id = "p1"
    mock_run.variant_id = "v1"
    mock_run.outcome = "completed"
    mock_run.started_at = None

    mock_step = MagicMock()
    mock_step.run_id = "r1"
    mock_step.index = 0
    mock_step.action = "click"
    mock_step.thought = "ok"
    mock_step.confused = False
    mock_step.screenshot_path = ""

    with patch("backend.swarm_runner.Session") as MockSession, \
         patch("backend.swarm_runner.get_engine"):

        mock_session = MagicMock()
        MockSession.return_value.__enter__ = MagicMock(return_value=mock_session)
        MockSession.return_value.__exit__ = MagicMock(return_value=None)

        exec_results = [[mock_run], [mock_step]]
        call_count = 0

        def fake_exec(stmt):
            nonlocal call_count
            result = MagicMock()
            result.all.return_value = exec_results[call_count % len(exec_results)]
            call_count += 1
            return result

        mock_session.exec = fake_exec

        from backend.swarm_runner import replay_study
        await replay_study("study_1", queue)

    assert not gemini_called, "replay_study must not call Gemini"
    assert not queue.empty(), "SSE events should have been queued"
