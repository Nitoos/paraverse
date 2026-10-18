import { useState } from "react";
import { createStudy, type StudyPayload } from "../api/client";

const DEFAULT_SEGMENTS: Record<string, number> = {
  new_hire: 2,
  power_user: 2,
  non_native: 1,
  frontline_mobile: 1,
  low_vision: 1,
  occasional: 1,
};

const SEGMENT_LABELS: Record<string, string> = {
  new_hire: "New Hire",
  power_user: "Power User",
  non_native: "Non-Native Speaker",
  frontline_mobile: "Frontline Mobile",
  low_vision: "Low Vision",
  occasional: "Occasional User",
};

const SEGMENT_ICONS: Record<string, string> = {
  new_hire: "👤",
  power_user: "⚡",
  non_native: "🌐",
  frontline_mobile: "📱",
  low_vision: "👁",
  occasional: "🕐",
};

const BASE = "http://localhost:3001";
const DEFAULT_VARIANTS: Record<string, string> = {
  baseline: `${BASE}/baseline/`,
  flawed: `${BASE}/flawed/`,
  fixed: `${BASE}/fixed/`,
};

const DEMO_STUDY_ID = "cd388de5-cbe0-4b98-8aa7-abea51c7f503";

interface Props {
  onStudyCreated: (studyId: string, variantMap: Record<string, string>) => void;
  onLoadDemo: (studyId: string) => void;
}

export default function Setup({ onStudyCreated, onLoadDemo }: Props) {
  const [taskGoal, setTaskGoal] = useState("Submit an expense report for a team dinner on 2024-12-01 for $150.");
  const [segments, setSegments] = useState(DEFAULT_SEGMENTS);
  const [variants, setVariants] = useState(DEFAULT_VARIANTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAgents = Object.values(segments).reduce((s, n) => s + n, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: StudyPayload = { task_goal: taskGoal, segment_mix: segments, variant_urls: variants };
      const res = await createStudy(payload);
      const variantMap: Record<string, string> = {};
      for (const v of res.variants) variantMap[v.id] = v.name;
      onStudyCreated(res.study_id, variantMap);
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      {/* Top nav */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8eaed", padding: "0 24px", height: 64, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #1a73e8, #34a853)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>P</span>
        </div>
        <span style={{ fontWeight: 700, fontSize: 18, color: "#202124" }}>Paraverse</span>
        <span style={{ color: "#dadce0", marginLeft: 4 }}>|</span>
        <span style={{ color: "#5f6368", fontSize: 14 }}>Synthetic UX Simulation</span>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
        {/* Demo banner */}
        <div style={{
          background: "linear-gradient(135deg, #e8f0fe 0%, #e6f4ea 100%)",
          border: "1px solid #c5d9f7",
          borderRadius: 16,
          padding: "20px 24px",
          marginBottom: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>🎬</span>
              <span style={{ fontWeight: 700, color: "#1a73e8", fontSize: 15 }}>Pre-computed Demo Ready</span>
            </div>
            <p style={{ color: "#3c4043", fontSize: 13, margin: 0 }}>
              32 agents · Baseline vs Flawed Redesign · All results computed
            </p>
          </div>
          <button
            type="button"
            onClick={() => onLoadDemo(DEMO_STUDY_ID)}
            style={{
              background: "#1a73e8",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 6px rgba(26,115,232,0.3)",
            }}
          >
            View Demo →
          </button>
        </div>

        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#202124", margin: "0 0 6px" }}>New Study</h1>
          <p style={{ color: "#5f6368", fontSize: 14, margin: 0 }}>Configure your synthetic workforce simulation</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Task goal */}
          <div className="card" style={{ padding: 24 }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: 14, color: "#202124", marginBottom: 8 }}>
              Task Goal
            </label>
            <p style={{ color: "#5f6368", fontSize: 12, marginBottom: 12 }}>
              What should agents try to accomplish on the UI?
            </p>
            <textarea
              value={taskGoal}
              onChange={(e) => setTaskGoal(e.target.value)}
              rows={3}
              required
              style={{
                width: "100%",
                background: "#f8f9fa",
                border: "1px solid #dadce0",
                borderRadius: 8,
                padding: "12px 14px",
                fontSize: 14,
                color: "#202124",
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* Agent mix */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: 14, color: "#202124" }}>Agent Mix</label>
                <p style={{ color: "#5f6368", fontSize: 12, margin: "4px 0 0" }}>Choose how many of each persona type to simulate</p>
              </div>
              <span style={{
                background: "#e8f0fe",
                color: "#1a73e8",
                fontWeight: 700,
                fontSize: 13,
                padding: "4px 12px",
                borderRadius: 20,
              }}>
                {totalAgents} agents
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {Object.entries(segments).map(([seg, count]) => (
                <div key={seg} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#f8f9fa",
                  borderRadius: 8,
                  padding: "10px 14px",
                  border: "1px solid #e8eaed",
                }}>
                  <span style={{ fontSize: 18 }}>{SEGMENT_ICONS[seg]}</span>
                  <span style={{ flex: 1, fontSize: 13, color: "#3c4043", fontWeight: 500 }}>
                    {SEGMENT_LABELS[seg] ?? seg}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={count}
                    onChange={(e) =>
                      setSegments((s) => ({ ...s, [seg]: parseInt(e.target.value) || 0 }))
                    }
                    style={{
                      width: 48,
                      background: "#fff",
                      border: "1px solid #dadce0",
                      borderRadius: 6,
                      padding: "4px 8px",
                      textAlign: "center",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#202124",
                      outline: "none",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Variant URLs */}
          <div className="card" style={{ padding: 24 }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: 14, color: "#202124", marginBottom: 4 }}>Variant URLs</label>
            <p style={{ color: "#5f6368", fontSize: 12, marginBottom: 16 }}>Each URL is a different version of the UI to test</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(variants).map(([name, url]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{
                    width: 72,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#5f6368",
                    textTransform: "capitalize",
                    flexShrink: 0,
                  }}>{name}</span>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setVariants((v) => ({ ...v, [name]: e.target.value }))}
                    style={{
                      flex: 1,
                      background: "#f8f9fa",
                      border: "1px solid #dadce0",
                      borderRadius: 8,
                      padding: "9px 12px",
                      fontSize: 13,
                      color: "#202124",
                      outline: "none",
                      fontFamily: "monospace",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: "#fce8e6", border: "1px solid #f28b82", borderRadius: 8, padding: "12px 16px", color: "#c5221f", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || totalAgents === 0}
            className="btn-primary"
            style={{ fontSize: 15, padding: "14px 24px", borderRadius: 10 }}
          >
            {loading ? "Launching study…" : `Launch ${totalAgents} Agents`}
          </button>
        </form>
      </div>
    </div>
  );
}
