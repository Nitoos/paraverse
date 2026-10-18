import { type VariantMetrics } from "../api/client";

interface Props { variants: VariantMetrics[]; }

const COLORS = ["#1a73e8", "#ea4335", "#34a853", "#f9ab00"];

export default function Funnel({ variants }: Props) {
  const sorted = [...variants].sort((a, b) => b.completion_rate - a.completion_rate);
  const maxSteps = Math.max(...sorted.map((v) => v.funnel.length), 1);
  const W = 560, H = 220, padL = 10, padR = 40;
  const stepW = maxSteps > 1 ? (W - padL - padR) / (maxSteps - 1) : W - padL - padR;

  // Find cliff (big drop > 30%)
  const worstFunnel = sorted[sorted.length - 1]?.funnel ?? [];
  const cliffIdx = worstFunnel.findIndex((v, i) => i > 0 && worstFunnel[i - 1] - v > 0.25);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#202124" }}>Completion Funnel</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#5f6368" }}>Step-by-step survival rate per variant</p>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {sorted.map((v, i) => (
            <div key={v.variant_id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 4, borderRadius: 2, background: COLORS[i] }} />
              <span style={{ fontSize: 12, color: "#5f6368" }}>{v.variant_label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG chart */}
      <div style={{ background: "#f8f9fa", borderRadius: 12, padding: "16px 8px 8px" }}>
        <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: "100%", height: 220 }}>
          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((g) => {
            const y = H - g * H * 0.88 - 8;
            return (
              <g key={g}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e8eaed" strokeWidth={g === 0 ? 1.5 : 1} />
                <text x={W - padR + 6} y={y + 4} fontSize={9} fill="#9aa0a6" textAnchor="start">{(g * 100).toFixed(0)}%</text>
              </g>
            );
          })}

          {/* Step labels */}
          {Array.from({ length: maxSteps }).map((_, i) => (
            <text key={i} x={padL + i * stepW} y={H + 18} fontSize={9} fill="#9aa0a6" textAnchor="middle">S{i + 1}</text>
          ))}

          {/* Cliff marker */}
          {cliffIdx > 0 && (
            <g>
              <line x1={padL + cliffIdx * stepW} y1={0} x2={padL + cliffIdx * stepW} y2={H} stroke="#ea433530" strokeWidth={1.5} strokeDasharray="4,3" />
              <rect x={padL + cliffIdx * stepW - 24} y={6} width={48} height={15} rx={6} fill="#fce8e6" />
              <text x={padL + cliffIdx * stepW} y={17} fontSize={8} fill="#c5221f" textAnchor="middle" fontWeight="600">drop-off</text>
            </g>
          )}

          {/* Area fills */}
          {sorted.map((v, i) => {
            const fillPts = [
              ...v.funnel.map((val, si) => `${padL + si * stepW},${H - val * H * 0.88 - 8}`),
              `${padL + (v.funnel.length - 1) * stepW},${H}`,
              `${padL},${H}`,
            ].join(" ");
            return <polygon key={v.variant_id + "f"} points={fillPts} fill={COLORS[i]} fillOpacity={0.07} />;
          })}

          {/* Lines */}
          {sorted.map((v, i) => {
            const pts = v.funnel.map((val, si) => `${padL + si * stepW},${H - val * H * 0.88 - 8}`).join(" ");
            return <polyline key={v.variant_id} points={pts} fill="none" stroke={COLORS[i]} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />;
          })}

          {/* Dots */}
          {sorted.map((v, i) =>
            v.funnel.map((val, si) => (
              <circle key={`${v.variant_id}-${si}`} cx={padL + si * stepW} cy={H - val * H * 0.88 - 8} r={4}
                fill="#fff" stroke={COLORS[i]} strokeWidth={2} />
            ))
          )}
        </svg>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${sorted.length}, 1fr)`, gap: 12 }}>
        {sorted.map((v, i) => (
          <div key={v.variant_id} style={{
            border: `1px solid ${COLORS[i]}30`,
            borderRadius: 12,
            padding: "16px 20px",
            borderLeft: `4px solid ${COLORS[i]}`,
            background: "#fff",
          }}>
            <p style={{ margin: "0 0 12px", fontWeight: 600, fontSize: 13, color: "#202124" }}>{v.variant_label}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "Completed", value: `${(v.completion_rate * 100).toFixed(0)}%`, color: COLORS[i] },
                { label: "Confused", value: `${(v.confusion_rate * 100).toFixed(0)}%`, color: "#f9ab00" },
                { label: "Avg Time", value: `${v.avg_time_on_task.toFixed(0)}s`, color: "#5f6368" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color }}>{value}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 10, color: "#80868b" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
