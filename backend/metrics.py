import json
from collections import Counter
from dataclasses import dataclass, field
from typing import Optional

from sqlmodel import Session, select

from backend.models import Persona, Run, Step, Variant


@dataclass
class VariantMetrics:
    variant_id: str
    variant_label: str
    completion_rate: float
    avg_time_on_task: float  # simulated human seconds
    drop_off_step: int
    confusion_rate: float
    funnel: list[float]  # completion rate at each step index


@dataclass
class StudyMetrics:
    completion_rate: float
    avg_time_on_task: float
    drop_off_step: int
    confusion_rate: float
    by_variant: list[VariantMetrics]
    by_segment: dict[str, VariantMetrics] = field(default_factory=dict)
    extra_minutes_vs_baseline: float = 0.0
    hours_lost_per_year: float = 0.0
    support_tickets_avoided: float = 0.0


def compute_hours_lost(n_employees: int, freq_per_year: int, extra_minutes: float) -> float:
    return n_employees * freq_per_year * extra_minutes / 60.0


def _compute_variant_metrics(
    variant: Variant,
    runs: list[Run],
    steps_by_run: dict[str, list[Step]],
) -> VariantMetrics:
    if not runs:
        return VariantMetrics(
            variant_id=variant.id, variant_label=variant.label,
            completion_rate=0.0, avg_time_on_task=0.0,
            drop_off_step=0, confusion_rate=0.0, funnel=[],
        )

    completed = [r for r in runs if r.outcome == "completed"]
    completion_rate = len(completed) / len(runs)

    # Time on task: sum of human_time_seconds per run, averaged
    run_times = []
    for run in runs:
        steps = steps_by_run.get(run.id, [])
        run_times.append(sum(s.human_time_seconds for s in steps))
    avg_time = sum(run_times) / len(run_times) if run_times else 0.0

    # Drop-off step: most common last step index among abandoned runs
    abandoned = [r for r in runs if r.outcome in ("abandoned", "step_cap", "error")]
    drop_off_step = 0
    if abandoned:
        last_steps = []
        for run in abandoned:
            steps = steps_by_run.get(run.id, [])
            if steps:
                last_steps.append(max(s.index for s in steps))
        if last_steps:
            drop_off_step = Counter(last_steps).most_common(1)[0][0]

    # Confusion rate — exclude rate-limit errors (not user confusion)
    all_steps = [s for run in runs for s in steps_by_run.get(run.id, [])]
    real_steps = [s for s in all_steps if "429" not in (s.thought or "") and "RESOURCE_EXHAUSTED" not in (s.thought or "")]
    confusion_rate = (
        sum(1 for s in real_steps if s.confused) / len(real_steps)
        if real_steps else 0.0
    )

    # Funnel: for each step index, what fraction of runs reached it
    max_step = max((max((s.index for s in steps_by_run.get(r.id, [])), default=0) for r in runs), default=0)
    funnel = []
    for i in range(max_step + 1):
        reached = sum(
            1 for run in runs
            if any(s.index >= i for s in steps_by_run.get(run.id, []))
        )
        funnel.append(reached / len(runs))

    return VariantMetrics(
        variant_id=variant.id,
        variant_label=variant.label,
        completion_rate=completion_rate,
        avg_time_on_task=avg_time,
        drop_off_step=drop_off_step,
        confusion_rate=confusion_rate,
        funnel=funnel,
    )


def _compute_segment_metrics(
    segment: str,
    runs: list[Run],
    steps_by_run: dict[str, list[Step]],
) -> VariantMetrics:
    """Compute metrics for a named segment (reuses variant logic with a dummy variant)."""
    dummy = Variant(id=segment, study_id="", label=segment, url="")
    return _compute_variant_metrics(dummy, runs, steps_by_run)


def compute_metrics(
    study_id: str,
    session: Session,
    n_employees: int = 20000,
    freq_per_year: int = 12,
) -> StudyMetrics:
    variants = session.exec(select(Variant).where(Variant.study_id == study_id)).all()
    all_runs = session.exec(select(Run).where(Run.study_id == study_id)).all()
    all_steps = session.exec(
        select(Step).where(Step.run_id.in_([r.id for r in all_runs]))
    ).all()

    steps_by_run: dict[str, list[Step]] = {}
    for step in all_steps:
        steps_by_run.setdefault(step.run_id, []).append(step)

    by_variant = []
    for variant in variants:
        runs = [r for r in all_runs if r.variant_id == variant.id]
        vm = _compute_variant_metrics(variant, runs, steps_by_run)
        by_variant.append(vm)

    if not by_variant:
        return StudyMetrics(
            completion_rate=0.0, avg_time_on_task=0.0,
            drop_off_step=0, confusion_rate=0.0, by_variant=[],
        )

    # Overall (averaged across variants)
    overall_completion = sum(v.completion_rate for v in by_variant) / len(by_variant)
    overall_time = sum(v.avg_time_on_task for v in by_variant) / len(by_variant)
    overall_drop_off = by_variant[0].drop_off_step if by_variant else 0
    overall_confusion = sum(v.confusion_rate for v in by_variant) / len(by_variant)

    # Extra minutes vs baseline: cost-of-failure adjusted
    extra_minutes = 0.0
    if len(by_variant) > 1:
        baseline = by_variant[0]
        baseline_eff_time = baseline.avg_time_on_task / max(baseline.completion_rate, 0.1)
        worst_eff_time = max(
            v.avg_time_on_task / max(v.completion_rate, 0.1)
            for v in by_variant[1:]
        )
        extra_minutes = max(0.0, (worst_eff_time - baseline_eff_time) / 60.0)

    hours_lost = compute_hours_lost(n_employees, freq_per_year, extra_minutes)
    confusion_delta = max(0.0, max((v.confusion_rate for v in by_variant[1:]), default=0.0) - by_variant[0].confusion_rate)
    tickets_avoided = confusion_delta * n_employees * freq_per_year * 0.02

    # Segment breakdown: group runs by persona segment
    persona_map: dict[str, str] = {}  # run_id -> segment
    all_personas = session.exec(select(Persona).where(Persona.study_id == study_id)).all()
    persona_segment: dict[str, str] = {str(p.id): p.segment for p in all_personas}
    for run in all_runs:
        seg = persona_segment.get(str(run.persona_id), "Unknown")
        persona_map[str(run.id)] = seg

    runs_by_segment: dict[str, list[Run]] = {}
    for run in all_runs:
        seg = persona_map.get(str(run.id), "Unknown")
        runs_by_segment.setdefault(seg, []).append(run)

    by_segment: dict[str, VariantMetrics] = {}
    for seg, seg_runs in runs_by_segment.items():
        by_segment[seg] = _compute_segment_metrics(seg, seg_runs, steps_by_run)

    return StudyMetrics(
        completion_rate=overall_completion,
        avg_time_on_task=overall_time,
        drop_off_step=overall_drop_off,
        confusion_rate=overall_confusion,
        by_variant=by_variant,
        by_segment=by_segment,
        extra_minutes_vs_baseline=extra_minutes,
        hours_lost_per_year=hours_lost,
        support_tickets_avoided=tickets_avoided,
    )
