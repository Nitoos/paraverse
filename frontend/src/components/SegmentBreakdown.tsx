import { type SegmentMetrics, type VariantMetrics } from "../api/client";

interface Props {
  bySegment: Record<string, SegmentMetrics>;
  byVariant: VariantMetrics[];
}

const SEGMENT_COLORS: Record<string, string> = {
  "New Hire": "#1a73e8",
  "Power User": "#34a853",
  "Non-Native Speaker": "#f9ab00",
  "Frontline Mobile": "#fa7b17",
  "Occasional User": "#24c1e0",
  "Low Vision": "#a142f4",
};

function getColor(seg: string, idx: number): string {
  return SEGMENT_COLORS[seg] ?? ["#1a73e8","#34a853","#f9ab00","#fa7b17","#24c1e0","#a142f4"][idx % 6];
}

function riskBadge(completion: number, confusion: number) {
  if (completion < 0.3 || confusion > 0.6) return { label: "High Risk", bg: "#fce8e6", color: "#c5221f", border: "#f28b8240" };
  if (completion < 0.6 || confusion > 0.35) return { label: "At Risk", bg: "#fef7e0", color: "#7b4f00", border: "#f9ab0040" };
  return { label: "Healthy", bg: "#e6f4ea", color: "#137333", border: "#34a85340" };
}

export default function SegmentBreakdown({ bySegment, byVariant }: Props) {
  const segments = Object.entries(bySegment).sort((a, b) => a[1].completion_rate - b[1].completion_rate);
  if (segments.length === 0) {
    return <p style={{ color: "#5f6368", fontSize: 13 }}>No segment data available.</p>;
  }

  const maxCompletion = 1;
  const maxTime = Math.max(...segments.map(([, m]) => m.avg_time_on_task), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#202124" }}>Segment Breakdown</h3>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#5f6368" }}>
          How each persona group experienced the UI — across all variants combined
        </p>
      </div>

      {/* Horizontal completion bar chart */}
      <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 12, padding: 20 }}>
        <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 600, color: "#5f6368", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Task Completion Rate by Segment
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {segments.map(([seg, m], i) => {
            const color = getColor(seg, i);
            const badge = riskBadge(m.completion_rate, m.confusion_rate);
            return (
              <div key={seg}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#202124" }}>{seg}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: badge.bg, color: badge.color,
                      border: `1px solid ${badge.border}`,
                      padding: "1px 7px", borderRadius: 10,
                    }}>{badge.label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{(m.completion_rate * 100).toFixed(0)}%</span>
                </div>
                <div style={{ height: 10, background: "#f1f3f4", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 5, background: color,
                    width: `${(m.completion_rate / maxCompletion * 100).toFixed(1)}%`,
                    transition: "width 0.8s ease",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {segments.map(([seg, m], i) => {
          const color = getColor(seg, i);
          const badge = riskBadge(m.completion_rate, m.confusion_rate);
          return (
            <div key={seg} style={{
              background: "#fff",
              border: `1px solid ${color}28`,
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(60,64,67,0.07)",
            }}>
              {/* Color strip */}
              <div style={{ height: 4, background: color }} />
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#202124" }}>{seg}</p>
                  <span style={{
                    fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                    background: badge.bg, color: badge.color,
                    border: `1px solid ${badge.border}`,
                    padding: "2px 6px", borderRadius: 8,
                  }}>{badge.label}</span>
                </div>

                {/* Metrics */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "Completed", value: `${(m.completion_rate * 100).toFixed(0)}%`, color },
                    { label: "Confused", value: `${(m.confusion_rate * 100).toFixed(0)}%`, color: m.confusion_rate > 0.4 ? "#ea4335" : "#f9ab00" },
                    { label: "Avg time", value: `${m.avg_time_on_task.toFixed(0)}s`, color: "#5f6368" },
                    { label: "Drop-off step", value: `Step ${m.drop_off_step + 1}`, color: "#5f6368" },
                  ].map(({ label, value, color: vc }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f1f3f4", paddingTop: 7 }}>
                      <span style={{ fontSize: 11, color: "#80868b" }}>{label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: vc }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Mini time bar */}
                <div style={{ marginTop: 10, height: 4, background: "#f1f3f4", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", background: color, opacity: 0.5,
                    width: `${(m.avg_time_on_task / maxTime * 100).toFixed(1)}%`,
                  }} />
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 9, color: "#9aa0a6" }}>relative time on task</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Insight callout for worst segment */}
      {(() => {
        const worst = segments[0];
        if (!worst) return null;
        const [seg, m] = worst;
        const color = getColor(seg, 0);
        if (m.completion_rate >= 0.5) return null;
        return (
          <div style={{
            background: "#fff",
            border: "1px solid #f28b8240",
            borderLeft: `4px solid ${color}`,
            borderRadius: 12,
            padding: "14px 18px",
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#202124" }}>
              <span style={{ color }}>"{seg}"</span> is your most impacted segment
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#5f6368" }}>
              Only {(m.completion_rate * 100).toFixed(0)}% completion with {(m.confusion_rate * 100).toFixed(0)}% confusion rate —
              prioritise fixes that simplify the experience for this group first.
            </p>
          </div>
        );
      })()}
    </div>
  );
}
