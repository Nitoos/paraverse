import itertools
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import numpy as np

TUNING_INDICES = list(range(6))
HOLDOUT_INDICES = [6, 7]

ROLLOUTS_PATH = Path("calibration_seeds/rollouts.json")

SEGMENTS = ["new_hire", "power_user", "non_native", "frontline_mobile", "low_vision", "occasional"]
WEIGHT_OPTIONS = [0.5, 1.0, 1.5, 2.0]


@dataclass
class CalibrationResult:
    uncalibrated_accuracy: float
    calibrated_tuning_accuracy: float
    calibrated_holdout_accuracy: float
    total_rollouts: int
    holdout_count: int
    optimal_weights: dict[str, float]
    disclaimer: str = "Seeded illustrative data. N=8 rollouts; directional only."


def predict_winner(rollout: dict, weights: dict[str, float]) -> str:
    outcomes = rollout["segment_outcomes"]
    variant_labels = list(next(iter(outcomes.values())).keys())

    scores: dict[str, float] = {label: 0.0 for label in variant_labels}
    total_weight = 0.0

    for segment, variant_rates in outcomes.items():
        w = weights.get(segment, 1.0)
        total_weight += w
        for label, rate in variant_rates.items():
            scores[label] += rate * w

    if total_weight > 0:
        for label in scores:
            scores[label] /= total_weight

    return max(scores, key=lambda k: scores[k])


def _evaluate(rollouts: list[dict], indices: list[int], weights: dict[str, float]) -> float:
    correct = 0
    for i in indices:
        rollout = rollouts[i]
        predicted = predict_winner(rollout, weights)
        if predicted == rollout["known_winner"]:
            correct += 1
    return correct / len(indices) if indices else 0.0


def _tune(rollouts: list[dict], tuning_indices: list[int]) -> dict[str, float]:
    best_accuracy = -1.0
    best_weights: dict[str, float] = {seg: 1.0 for seg in SEGMENTS}

    # Grid search — 4^6 = 4096 combinations
    for combo in itertools.product(WEIGHT_OPTIONS, repeat=len(SEGMENTS)):
        weights = dict(zip(SEGMENTS, combo))
        acc = _evaluate(rollouts, tuning_indices, weights)
        if acc > best_accuracy:
            best_accuracy = acc
            best_weights = weights

    return best_weights


def run_calibration() -> CalibrationResult:
    rollouts = json.loads(ROLLOUTS_PATH.read_text())

    uniform_weights = {seg: 1.0 for seg in SEGMENTS}

    uncal_acc = _evaluate(rollouts, TUNING_INDICES, uniform_weights)
    optimal_weights = _tune(rollouts, TUNING_INDICES)
    cal_tuning_acc = _evaluate(rollouts, TUNING_INDICES, optimal_weights)
    cal_holdout_acc = _evaluate(rollouts, HOLDOUT_INDICES, optimal_weights)

    return CalibrationResult(
        uncalibrated_accuracy=uncal_acc,
        calibrated_tuning_accuracy=cal_tuning_acc,
        calibrated_holdout_accuracy=cal_holdout_acc,
        total_rollouts=len(rollouts),
        holdout_count=len(HOLDOUT_INDICES),
        optimal_weights=optimal_weights,
    )


_cached_result: Optional[CalibrationResult] = None


def get_calibration() -> CalibrationResult:
    global _cached_result
    if _cached_result is None:
        _cached_result = run_calibration()
    return _cached_result
