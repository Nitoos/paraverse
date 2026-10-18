import { useEffect, useState } from "react";
import { type FixResponse, type VariantMetrics, getFixes, suggestFixes } from "../api/client";

interface Props { studyId: string; variants: VariantMetrics[]; }

function impactLevel(s: string): "high" | "medium" | "low" {
  const l = s.toLowerCase();
  return l.includes("high") ? "high" : l.includes("medium") ? "medium" : "low";
}

const IMPACT = {
  high: { bg: "#e6f4ea", border: "#34a85340", chip: "#34a853", text: "#137333", label: "High Impact" },
  medium: { bg: "#fef7e0", border: "#f9ab0040", chip: "#f9ab00", text: "#7b4f00", label: "Medium Impact" },
  low: { bg: "#f8f9fa", border: "#dadce0", chip: "#80868b", text: "#3c4043", label: "Low Impact" },
};

const RANK_EMOJI = ["", "🥇", "🥈", "🥉", "4️⃣"];

export default function FixLoop({ studyId, variants }: Props) {
  const worst = [...variants].sort((a, b) => a.completion_rate - b.completion_rate)[0];
  const [selectedVariant, setSelectedVariant] = useState(worst?.variant_id ?? variants[0]?.variant_id ?? "");
  const [fixes, setFixes] = useState<FixResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studyId) return;
    setLoading(true);
    getFixes(studyId)
      .then((f) => { if (f.length > 0) setFixes(f); else return suggestFixes(studyId, selectedVariant).then(setFixes); })
      .catch(() => suggestFixes(studyId, selectedVariant).then(setFixes).catch((e) => setError(String(e))))
      .finally(() => setLoading(false));
  }, [studyId]);

  async function handleReanalyze() {
    setLoading(true); setError(null);
    try { setFixes(await suggestFixes(studyId, selectedVariant)); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#202124" }}>Fix Loop</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#5f6368" }}>Ranked friction points with suggested fixes</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={selectedVariant}
            onChange={(e) => setSelectedVariant(e.target.value)}
            style={{ background: "#fff", border: "1px solid #dadce0", borderRadius: 8, padding: "7px 12px", fontSize: 13, color: "#202124", outline: "none", cursor: "pointer" }}
          >
            {variants.map((v) => (
              <option key={v.variant_id} value={v.variant_id}>{v.variant_label}</option>
            ))}
          </select>
          <button
            onClick={handleReanalyze}
            disabled={loading}
            style={{
              background: loading ? "#f1f3f4" : "#1a73e8",
              color: loading ? "#80868b" : "#fff",
              border: "none",
              borderRadius: 8,
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {loading ? "Analyzing…" : "Re-analyze"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#fce8e6", border: "1px solid #f28b82", borderRadius: 8, padding: "10px 14px", color: "#c5221f", fontSize: 13 }}>{error}</div>
      )}

      {loading && fixes.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", padding: "40px 0", color: "#5f6368", fontSize: 13 }}>
          <div style={{ width: 20, height: 20, border: "2px solid #e8eaed", borderTopColor: "#1a73e8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          Finding friction points…
        </div>
      )}

      {fixes.length > 0 && (
        <>
          {/* Impact summary bar */}
          <div style={{ background: "#f8f9fa", border: "1px solid #e8eaed", borderRadius: 12, padding: 16 }}>
            <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, color: "#80868b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Impact Summary
            </p>
            <div style={{ display: "flex", gap: 3, height: 12, borderRadius: 6, overflow: "hidden" }}>
              {fixes.map((fix) => {
                const level = impactLevel(fix.expected_impact);
                const widths = { high: "35%", medium: "28%", low: "18.5%" };
                return (
                  <div key={fix.id} title={fix.suggestion}
                    style={{ flex: "none", width: widths[level], background: IMPACT[level].chip, borderRadius: 3, opacity: 0.85 }} />
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              {(["high", "medium", "low"] as const).map((level) => (
                <div key={level} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: IMPACT[level].chip }} />
                  <span style={{ fontSize: 11, color: "#5f6368" }}>{IMPACT[level].label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fix cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {fixes.map((fix) => {
              const level = impactLevel(fix.expected_impact);
              const style = IMPACT[level];
              return (
                <div key={fix.id} style={{
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  borderRadius: 12,
                  padding: "16px 20px",
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}>
                  <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>
                    {RANK_EMOJI[fix.rank] ?? `#${fix.rank}`}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        background: style.chip,
                        color: "#fff",
                        padding: "2px 8px",
                        borderRadius: 20,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}>
                        {style.label}
                      </span>
                      <span style={{ fontSize: 11, color: "#80868b" }}>at Step {fix.step_index + 1}</span>
                    </div>
                    <p style={{ margin: "0 0 8px", fontSize: 14, color: "#202124", lineHeight: 1.6 }}>{fix.suggestion}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: style.text, fontWeight: 600 }}>→ {fix.expected_impact}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
