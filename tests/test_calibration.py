import pytest
from backend.calibration import (
    HOLDOUT_INDICES,
    TUNING_INDICES,
    predict_winner,
    run_calibration,
)
from backend.metrics import VariantMetrics


def test_tuning_and_holdout_are_disjoint():
    assert set(TUNING_INDICES) & set(HOLDOUT_INDICES) == set()
    assert TUNING_INDICES == list(range(6))
    assert HOLDOUT_INDICES == [6, 7]


def test_predict_winner_higher_completion_wins():
    rollout = {
        "segment_outcomes": {
            "new_hire": {"baseline": 0.80, "flawed": 0.45},
            "power_user": {"baseline": 0.95, "flawed": 0.80},
        }
    }
    weights = {"new_hire": 1.0, "power_user": 1.0}
    winner = predict_winner(rollout, weights)
    assert winner == "baseline"


def test_predict_winner_weight_can_flip_result():
    # power_user strongly prefers variant B, but weight=0 means only new_hire counts
    rollout = {
        "segment_outcomes": {
            "new_hire": {"A": 0.90, "B": 0.40},
            "power_user": {"A": 0.20, "B": 0.95},
        }
    }
    # With equal weights, A wins (0.55 vs 0.675)... wait let me recalc
    # A: (0.90+0.20)/2 = 0.55, B: (0.40+0.95)/2 = 0.675 → B wins with equal weights
    weights_equal = {"new_hire": 1.0, "power_user": 1.0}
    assert predict_winner(rollout, weights_equal) == "B"

    # With power_user weight=0 (no influence), only new_hire: A=0.90 > B=0.40
    weights_skewed = {"new_hire": 1.0, "power_user": 0.0}
    assert predict_winner(rollout, weights_skewed) == "A"


def test_calibration_holdout_indices_never_used_for_tuning():
    # The rollout indices used during tuning must not include 6 or 7
    for i in TUNING_INDICES:
        assert i not in HOLDOUT_INDICES, f"Index {i} appears in both tuning and holdout sets"


def test_run_calibration_returns_result():
    result = run_calibration()
    assert 0.0 <= result.uncalibrated_accuracy <= 1.0
    assert 0.0 <= result.calibrated_tuning_accuracy <= 1.0
    assert 0.0 <= result.calibrated_holdout_accuracy <= 1.0
    assert result.total_rollouts == 8
    assert result.holdout_count == 2
    assert "Seeded" in result.disclaimer


def test_calibration_tuning_accuracy_gte_uncalibrated():
    result = run_calibration()
    # Tuning set accuracy should be at least as good after tuning
    assert result.calibrated_tuning_accuracy >= result.uncalibrated_accuracy
