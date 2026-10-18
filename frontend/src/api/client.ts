const BASE = "http://localhost:8000/api";

export interface StudyPayload {
  task_goal: string;
  segment_mix: Record<string, number>;
  variant_urls: Record<string, string>;
}

export interface StudyResponse {
  study_id: string;
  variants: { id: string; name: string; url: string }[];
}

export interface StepEvent {
  type: "step" | "terminal";
  agent_id: string;
  persona_segment?: string;
  step_index?: number;
  action?: string;
  thought?: string;
  confused?: boolean;
  status?: string;
  screenshot_path?: string;
  outcome?: string;
  total_steps?: number;
}

export interface VariantMetrics {
  variant_id: string;
  variant_label: string;
  completion_rate: number;
  avg_time_on_task: number;
  drop_off_step: number;
  confusion_rate: number;
  funnel: number[];
}

export interface SegmentMetrics {
  variant_id: string;
  variant_label: string;
  completion_rate: number;
  avg_time_on_task: number;
  drop_off_step: number;
  confusion_rate: number;
  funnel: number[];
}

export interface MetricsResponse {
  completion_rate: number;
  avg_time_on_task: number;
  drop_off_step: number;
  confusion_rate: number;
  extra_minutes_vs_baseline: number;
  hours_lost_per_year: number;
  support_tickets_avoided: number;
  by_variant: VariantMetrics[];
  by_segment?: Record<string, SegmentMetrics>;
}

export interface FixResponse {
  id: string;
  rank: number;
  suggestion: string;
  expected_impact: string;
}

export interface CalibrationResponse {
  optimal_weights: Record<string, number>;
  calibrated_tuning_accuracy: number;
  calibrated_holdout_accuracy: number;
  uncalibrated_accuracy: number;
  total_rollouts: number;
  holdout_count: number;
  disclaimer: string;
}

export async function createStudy(payload: StudyPayload): Promise<StudyResponse> {
  const variants = Object.entries(payload.variant_urls).map(([label, url]) => ({
    url,
    label,
    notes: "",
  }));
  const backendPayload = {
    name: `Study ${new Date().toISOString().slice(0, 16)}`,
    task: payload.task_goal,
    mode: "live",
    segment_mix: payload.segment_mix,
    variants,
  };
  const res = await fetch(`${BASE}/studies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(backendPayload),
  });
  if (!res.ok) throw new Error(await res.text());
  const study = await res.json();
  return {
    study_id: study.id,
    variants: study.variants ?? variants.map((v, i) => ({ id: `v${i}`, name: v.label, url: v.url })),
  };
}

export function streamSwarm(studyId: string, onEvent: (e: StepEvent) => void): EventSource {
  const es = new EventSource(`${BASE}/studies/${studyId}/stream`);
  es.onmessage = (ev) => {
    try {
      onEvent(JSON.parse(ev.data));
    } catch {}
  };
  return es;
}

export function replayStudy(studyId: string, onEvent: (e: StepEvent) => void): EventSource {
  const es = new EventSource(`${BASE}/studies/${studyId}/replay`);
  es.onmessage = (ev) => {
    try {
      onEvent(JSON.parse(ev.data));
    } catch {}
  };
  return es;
}

export async function getMetrics(studyId: string): Promise<MetricsResponse> {
  const res = await fetch(`${BASE}/studies/${studyId}/metrics`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getFixes(studyId: string): Promise<FixResponse[]> {
  const res = await fetch(`${BASE}/studies/${studyId}/fixes`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function suggestFixes(studyId: string, variantId: string): Promise<FixResponse[]> {
  const res = await fetch(`${BASE}/studies/${studyId}/fixes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ variant_id: variantId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getCalibration(): Promise<CalibrationResponse> {
  const res = await fetch(`${BASE}/calibration`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function screenshotUrl(path: string): string {
  const rel = path.replace(/^.*data\/screenshots\//, "");
  return `${BASE}/screenshots/${rel}`;
}
