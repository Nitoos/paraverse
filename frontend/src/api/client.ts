const BASE = "http://localhost:8000";

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

export interface MetricsResponse {
  variant_id: string;
  variant_name: string;
  completion_rate: number;
  abandonment_rate: number;
  avg_steps: number;
  avg_human_minutes: number;
  hours_lost_per_1000: number;
  confusion_rate: number;
  extra_minutes_vs_baseline: number;
  support_tickets_avoided: number;
}

export interface FixResponse {
  id: string;
  rank: number;
  suggestion: string;
  expected_impact: string;
}

export interface CalibrationResponse {
  best_weights: Record<string, number>;
  tuning_accuracy: number;
  holdout_accuracy: number;
  n_combos_tried: number;
}

export async function createStudy(payload: StudyPayload): Promise<StudyResponse> {
  const res = await fetch(`${BASE}/studies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
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

export async function getMetrics(studyId: string): Promise<MetricsResponse[]> {
  const res = await fetch(`${BASE}/studies/${studyId}/metrics`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function suggestFixes(studyId: string, variantId: string): Promise<FixResponse[]> {
  const res = await fetch(`${BASE}/studies/${studyId}/fixes?variant_id=${variantId}`, {
    method: "POST",
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
  const encoded = encodeURIComponent(path);
  return `${BASE}/screenshots?path=${encoded}`;
}
