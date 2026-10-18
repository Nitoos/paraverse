import { useState } from "react";
import { type MetricsResponse } from "../api/client";

interface Props { metrics: MetricsResponse; }

function Donut({ pct, color, label, sub }: { pct: number; color: string; label: string; sub?: string }) {
  const size = 96, stroke = 10, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r, dash = circ * Math.min(pct, 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f3f4" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize={15} fontWeight={700} fill="#202124">
          {(pct * 100).toFixed(0)}%
        </text>
      </svg>
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#202124" }}>{label}</p>
        {sub && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#80868b" }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function HoursLost({ metrics }: Props) {
  const [hourlyRate, setHourlyRate] = useState(45);
  const maxConf = Math.max(...metrics.by_variant.map((v) => v.confusion_rate), 0.01);
  const maxTime = Math.max(...metrics.by_variant.map((v) => v.avg_time_on_task), 1);
  const COLORS = ["#1a73e8", "#ea4335", "#34a853", "#f9ab00"];
  const dollarCost = metrics.hours_lost_per_year * hourlyRate;

  function formatDollar(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
    return `$${n.toFixed(0)}`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#202124" }}>Productivity Impact</h3>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#5f6368" }}>Estimated cost of UX friction across your workforce</p>
      </div>

      {/* Hero banner */}
      <div style={{
        background: "linear-gradient(135deg, #fce8e6 0%, #fef7e0 100%)",
        border: "1px solid #f28b8240",
        borderRadius: 16,
        padding: "24px 28px",
      }}>
        {/* Top row: hours + dollar cost side by side */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 24, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 48, fontWeight: 800, color: "#c5221f", lineHeight: 1 }}>
              {metrics.hours_lost_per_year >= 1000
                ? `${(metrics.hours_lost_per_year / 1000).toFixed(1)}k`
                : metrics.hours_lost_per_year.toFixed(0)}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#c5221f", fontWeight: 600 }}>person-hours lost / year</p>
          </div>
          <div style={{ width: 1, background: "#f28b8240", alignSelf: "stretch" }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 48, fontWeight: 800, color: "#b5410c", lineHeight: 1 }}>
              {formatDollar(dollarCost)}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#b5410c", fontWeight: 600 }}>in lost productivity / year</p>
          </div>
        </div>

        {/* Hourly rate input */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, background: "#fff8", borderRadius: 8, padding: "8px 12px", width: "fit-content" }}>
          <span style={{ fontSize: 12, color: "#5f6368" }}>Avg hourly rate:</span>
          <span style={{ fontSize: 12, color: "#5f6368" }}>$</span>
          <input
            type="number"
            min={1}
            max={500}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Math.max(1, parseInt(e.target.value) || 45))}
            style={{
              width: 56, border: "1px solid #dadce0", borderRadius: 6,
              padding: "3px 6px", fontSize: 13, fontWeight: 600,
              color: "#202124", outline: "none", textAlign: "center",
            }}
          />
          <span style={{ fontSize: 12, color: "#5f6368" }}>/hr</span>
          <span style={{ fontSize: 10, color: "#9aa0a6", marginLeft: 4 }}>adjust to match your workforce</span>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            { label: "Extra time per task", value: `+${metrics.extra_minutes_vs_baseline.toFixed(1)} min`, color: "#f9ab00" },
            { label: "Support tickets avoided", value: `${metrics.support_tickets_avoided.toFixed(0)}`, color: "#34a853" },
            { label: "Overall confusion rate", value: `${(metrics.confusion_rate * 100).toFixed(0)}%`, color: "#ea4335" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color }}>{value}</span>
              <span style={{ fontSize: 11, color: "#5f6368" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column: donuts + confusion */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Completion donuts */}
        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 12, padding: 20 }}>
          <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 600, color: "#5f6368", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Task Completion Rate
          </p>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            {metrics.by_variant.map((v, i) => (
              <Donut key={v.variant_id} pct={v.completion_rate} color={COLORS[i]} label={v.variant_label} />
            ))}
          </div>
        </div>

        {/* Confusion bars */}
        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 12, padding: 20 }}>
          <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 600, color: "#5f6368", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Confusion Rate
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {metrics.by_variant.map((v, i) => (
              <div key={v.variant_id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#3c4043" }}>{v.variant_label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#f9ab00" }}>{(v.confusion_rate * 100).toFixed(0)}%</span>
                </div>
                <div style={{ height: 8, background: "#f1f3f4", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 4,
                    width: `${(v.confusion_rate / maxConf * 100).toFixed(1)}%`,
                    background: COLORS[i],
                    transition: "width 0.8s ease",
                  }} />
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 10, color: "#9aa0a6" }}>% of steps where agent was lost or confused</p>
        </div>
      </div>

      {/* Time comparison */}
      <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 12, padding: 20 }}>
        <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 600, color: "#5f6368", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Average Time on Task (seconds)
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {metrics.by_variant.map((v, i) => (
            <div key={v.variant_id}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "#3c4043" }}>{v.variant_label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#202124" }}>{v.avg_time_on_task.toFixed(0)}s</span>
              </div>
              <div style={{ height: 10, background: "#f1f3f4", borderRadius: 5, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 5,
                  width: `${(v.avg_time_on_task / maxTime * 100).toFixed(1)}%`,
                  background: `linear-gradient(90deg, ${COLORS[i]}cc, ${COLORS[i]})`,
                  transition: "width 0.8s ease",
                }} />
              </div>
            </div>
          ))}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 10, color: "#9aa0a6", fontStyle: "italic" }}>
          Note: lower time on flawed UI = agents gave up early, not faster completion
        </p>
      </div>
    </div>
  );
}
