import json
import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_generate_personas_count_matches_mix():
    mix = {"new_hire": 2, "power_user": 1}
    persona_json = json.dumps({
        "tenure_years": 0.5, "tech_literacy": 3, "language_fluency": 5,
        "device": "desktop_800", "patience_budget_steps": 10,
        "patience_budget_seconds": 180, "accessibility_needs": [],
        "behavioral_rules": ["Read all labels carefully."],
    })

    with patch("backend.persona_generator._call_gemini", new_callable=AsyncMock) as mock:
        mock.return_value = persona_json
        with patch("backend.persona_generator.get_engine") as mock_engine:
            from unittest.mock import MagicMock
            mock_session = MagicMock()
            mock_engine.return_value = MagicMock()
            mock_session.__enter__ = MagicMock(return_value=mock_session)
            mock_session.__exit__ = MagicMock(return_value=None)

            from backend.persona_generator import generate_personas
            with patch("backend.persona_generator.Session", return_value=mock_session):
                personas = await generate_personas("study_1", mix)

    assert len(personas) == 3
    assert sum(1 for p in personas if p.segment == "new_hire") == 2
    assert sum(1 for p in personas if p.segment == "power_user") == 1


@pytest.mark.asyncio
async def test_generate_personas_device_by_segment():
    persona_json = json.dumps({
        "tenure_years": 1.0, "tech_literacy": 2, "language_fluency": 4,
        "device": "mobile_375", "patience_budget_steps": 8,
        "patience_budget_seconds": 120, "accessibility_needs": [],
        "behavioral_rules": [],
    })

    with patch("backend.persona_generator._call_gemini", new_callable=AsyncMock) as mock:
        mock.return_value = persona_json
        with patch("backend.persona_generator.Session") as mock_session_cls:
            mock_session = mock_session_cls.return_value.__enter__.return_value

            from backend.persona_generator import generate_personas
            personas = await generate_personas("study_1", {"frontline_mobile": 1})

    # Device must be mobile_375 for frontline_mobile (enforced regardless of Gemini output)
    assert personas[0].device == "mobile_375"
    assert personas[0].segment == "frontline_mobile"
