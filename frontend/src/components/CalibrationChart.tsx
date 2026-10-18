import { useEffect, useState } from "react";
import { type CalibrationResponse, getCalibration } from "../api/client";

const SEGMENT_LABELS: Record<string, string> = {
  new_hire: "New Hire", power_user: "Power User", non_native: "Non-Native",
  frontline_mobile: "Frontline", low_vision: "Low Vision", occasional: "Occasional",
};

const SEG_COLORS = ["#1a73e8", "#34a853", "#f9ab00", "#ea4335", "#a142f4", "#24c1e0"];

export default function CalibrationChart() {
  const [cal, setCal] = useState<CalibrationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getCalibration().then(setCal).catch((e) => setError(String(e))); }, []);

  if (error) return <p style={{ color: "#c5221f", fontSize: 13 }}>{error}</p>;
  if (!cal) return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", padding: "40px 0", color: "#5f6368", fontSize: 13 }}>
      <div style={{ width: 20, height: 20, border: "2px solid #e8eaed", borderTopColor: "#1a73e8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      Loading calibration…
    </div>
  );

  const weights = cal.optimal_weights;
  const segments = Object.keys(weights);
  const maxW = Math.max(...Object.values(weights), 0.01);

  // Half-circle gauge
  function HalfGauge({ pct, color, label, sub }: { pct: number; color: string; label: string; sub: string }) {
    const size = 100, stroke = 10, r = (size - stroke) / 2;
    const halfCirc = Math.PI * r;
    const dash = halfCirc * Math.min(pct, 1);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
          <path d={`M ${stroke / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${size / 2}`}
            fill="none" stroke="#f1f3f4" strokeWidth={stroke} strokeLinecap="round" />
          <path d={`M ${stroke / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${size / 2}`}
            fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${dash} ${halfCirc}`} />
          <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={14} fontWeight={700} fill="#202124">
            {(pct * 100).toFixed(0)}%
          </text>
        </svg>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#202124" }}>{label}</p>
        <p style={{ margin: 0, fontSize: 10, color: "#80868b" }}>{sub}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#202124" }}>Calibration</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#5f6368" }}>
            How accurately do AI agents predict real confusion?
          </p>
        </div>
        <span style={{ fontSize: 11, color: "#80868b" }}>
          {cal.total_rollouts - cal.holdout_count} tuning · {cal.holdout_count} held-out
        </span>
      </div>

      {/* Accuracy gauges */}
      <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 12, padding: 24 }}>
        <p style={{ margin: "0 0 20px", fontSize: 11, fontWeight: 600, color: "#5f6368", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Prediction Accuracy
        </p>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <HalfGauge pct={cal.calibrated_tuning_accuracy} color="#1a73e8" label="Tuning Set" sub="Calibrated" />
          <HalfGauge pct={cal.calibrated_holdout_accuracy} color="#34a853" label="Holdout Set" sub="Real accuracy" />
          <HalfGauge pct={cal.uncalibrated_accuracy} color="#9aa0a6" label="Baseline" sub="Uncalibrated" />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, padding: "8px 16px", background: "#e6f4ea", borderRadius: 8 }}>
          <span style={{ fontSize: 12, color: "#137333" }}>
            ↑ Calibration improved accuracy from{" "}
            <strong>{(cal.uncalibrated_accuracy * 100).toFixed(0)}%</strong> → <strong>{(cal.calibrated_holdout_accuracy * 100).toFixed(0)}%</strong>
          </span>
        </div>
      </div>

      {/* Segment weight bars */}
      <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 12, padding: 20 }}>
        <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "#5f6368", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Segment Calibration Weights
        </p>
        <p style={{ margin: "0 0 16px", fontSize: 11, color: "#80868b" }}>Higher = this segment's signals are more reliable</p>

        {/* SVG bar chart */}
        {(() => {
          const W = 520, H = 140;
          const barW = Math.min(44, (W / segments.length) * 0.55);
          const slotW = W / segments.length;
          return (
            <svg viewBox={`0 0 ${W} ${H + 28}`} style={{ width: "100%", height: 160 }}>
              {[0.5, 1].map((g) => {
                const y = H - (g / 1) * H * 0.82;
                return (
                  <g key={g}>
                    <line x1={0} y1={y} x2={W} y2={y} stroke="#f1f3f4" strokeWidth={1} />
                    <text x={W + 2} y={y + 4} fontSize={8} fill="#9aa0a6">{g.toFixed(1)}×</text>
                  </g>
                );
              })}

              {segments.map((seg, i) => {
                const x = slotW * i + slotW / 2;
                const val = weights[seg] ?? 0;
                const barH = (val / maxW) * H * 0.82;
                const y = H - barH;
                const color = SEG_COLORS[i % SEG_COLORS.length];
                return (
                  <g key={seg}>
                    <rect x={x - barW / 2} y={y} width={barW} height={barH} rx={6}
                      fill={color} fillOpacity={0.8} />
                    <text x={x} y={y - 5} fontSize={9} fill="#202124" textAnchor="middle" fontWeight={600}>
                      {val.toFixed(2)}
                    </text>
                    <text x={x} y={H + 14} fontSize={9} fill="#5f6368" textAnchor="middle">
                      {(SEGMENT_LABELS[seg] ?? seg).split(" ")[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          );
        })()}
      </div>

      <p style={{ fontSize: 11, color: "#9aa0a6", fontStyle: "italic", margin: 0 }}>{cal.disclaimer}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
