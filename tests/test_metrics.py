import pytest
from unittest.mock import MagicMock

from backend.metrics import compute_hours_lost


def test_hours_lost_formula():
    # H = N * F * delta_m / 60
    # 20000 employees, 12 times/year, 4 extra minutes → 16000 hours
    assert compute_hours_lost(20000, 12, 4.0) == pytest.approx(16000.0)


def test_hours_lost_zero_delta():
    assert compute_hours_lost(20000, 12, 0.0) == pytest.approx(0.0)


def test_hours_lost_small_population():
    # 100 employees, 52 times/year, 1 extra minute → 100*52*1/60 ≈ 86.67
    result = compute_hours_lost(100, 52, 1.0)
    assert result == pytest.approx(100 * 52 / 60.0)


def test_compute_metrics_uses_session(tmp_path):
    """compute_metrics reads from the session — verify it calls session.exec"""
    from unittest.mock import MagicMock
    from backend.metrics import compute_metrics

    session = MagicMock()
    # Return empty lists so we get a zero-baseline result without DB
    session.exec.return_value.all.return_value = []

    metrics = compute_metrics("study_1", session)
    assert metrics.completion_rate == 0.0
    assert metrics.hours_lost_per_year == 0.0
