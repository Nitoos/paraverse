import { useEffect, useState } from "react";
import { type MetricsResponse, getMetrics } from "../api/client";
import Funnel from "./Funnel";
import HoursLost from "./HoursLost";
import FixLoop from "./FixLoop";
import CalibrationChart from "./CalibrationChart";
import SegmentBreakdown from "./SegmentBreakdown";

interface Props { studyId: string; onRestart: () => void; }

const COLORS = ["#1a73e8", "#ea4335", "#34a853", "#f9ab00"];

const TABS = [
  { id: "funnel", label: "Funnel" },
  { id: "segments", label: "Segments" },
  { id: "hours", label: "Hours Lost" },
  { id: "fixes", label: "Fix Loop" },
  { id: "calibration", label: "Calibration" },
] as const;

export default function Report({ studyId, onRestart }: Props) {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"funnel" | "segments" | "hours" | "fixes" | "calibration">("funnel");

  useEffect(() => {
    getMetrics(studyId).then(setMetrics).catch((e) => setError(String(e))).finally(() => setLoading(false));
  }, [studyId]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, border: "3px solid #e8eaed", borderTopColor: "#1a73e8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "#5f6368", fontSize: 14, margin: 0 }}>Computing metrics…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#c5221f", marginBottom: 12 }}>{error ?? "No metrics found"}</p>
          <button onClick={onRestart} style={{ color: "#1a73e8", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>Start over</button>
        </div>
      </div>
    );
  }

  const sorted = [...metrics.by_variant].sort((a, b) => b.completion_rate - a.completion_rate);
  const winner = sorted[0];
  const loser = sorted[sorted.length - 1];
  const completionDelta = winner && loser ? winner.completion_rate - loser.completion_rate : 0;
  const confusionDelta = loser && winner ? loser.confusion_rate - winner.confusion_rate : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      {/* Top nav */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid #e8eaed",
        padding: "0 24px",
        height: 64,
        display: "flex",
        alignItems: "center",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #1a73e8, #34a853)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>P</span>
        </div>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#202124" }}>Paraverse</span>
        <span style={{ color: "#dadce0" }}>|</span>
        <span style={{ fontSize: 14, color: "#5f6368" }}>Study Report</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={onRestart}
          style={{
            background: "none",
            border: "1px solid #dadce0",
            borderRadius: 8,
            padding: "7px 16px",
            fontSize: 13,
            color: "#3c4043",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          ← New Study
        </button>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Insight alert */}
        {completionDelta > 0.1 && (
          <div style={{
            background: "#fff",
            border: "1px solid #f28b8240",
            borderLeft: "4px solid #ea4335",
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 1px 3px rgba(60,64,67,0.08)",
          }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#202124" }}>
                {loser?.variant_label} has{" "}
                <span style={{ color: "#c5221f" }}>{(completionDelta * 100).toFixed(0)}% lower completion</span>
                {" "}and{" "}
                <span style={{ color: "#e37400" }}>{(confusionDelta * 100).toFixed(0)}% more confusion</span>
                {" "}than {winner?.variant_label}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#5f6368" }}>
                Estimated cost:{" "}
                <strong style={{ color: "#c5221f" }}>{metrics.hours_lost_per_year >= 1000 ? `${(metrics.hours_lost_per_year / 1000).toFixed(1)}k` : metrics.hours_lost_per_year.toFixed(0)} person-hours/year</strong>
                {" "}·{" "}
                <strong style={{ color: "#e37400" }}>+{metrics.extra_minutes_vs_baseline.toFixed(1)} min per task</strong>
              </p>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${sorted.length}, 1fr)`, gap: 16 }}>
          {sorted.map((m, i) => {
            const color = COLORS[i];
            const isWinner = i === 0;
            return (
              <div key={m.variant_id} style={{
                background: "#fff",
                borderRadius: 16,
                padding: 24,
                border: `1px solid ${isWinner ? color + "40" : "#e8eaed"}`,
                boxShadow: isWinner
                  ? `0 2px 8px ${color}18, 0 1px 3px rgba(60,64,67,0.08)`
                  : "0 1px 3px rgba(60,64,67,0.08)",
                position: "relative",
                overflow: "hidden",
              }}>
                {/* Top color strip */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: color, borderRadius: "16px 16px 0 0" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 4, marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#202124" }}>{m.variant_label}</p>
                  {isWinner && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: "#e6f4ea", color: "#137333", border: "1px solid #34a85330", padding: "2px 10px", borderRadius: 20 }}>
                      ✓ Winner
                    </span>
                  )}
                </div>

                {/* Big number */}
                <p style={{ margin: "0 0 4px", fontSize: 44, fontWeight: 800, color, lineHeight: 1 }}>
                  {(m.completion_rate * 100).toFixed(0)}%
                </p>
                <p style={{ margin: "0 0 14px", fontSize: 11, color: "#80868b" }}>completion rate</p>

                {/* Progress bar */}
                <div style={{ height: 6, background: "#f1f3f4", borderRadius: 3, marginBottom: 16, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: color, width: `${(m.completion_rate * 100).toFixed(1)}%`, transition: "width 1s ease" }} />
                </div>

                {/* Stats */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { k: "Avg time", v: `${m.avg_time_on_task.toFixed(0)}s`, vc: "#202124" },
                    { k: "Confusion", v: `${(m.confusion_rate * 100).toFixed(0)}%`, vc: m.confusion_rate > 0.3 ? "#e37400" : "#5f6368" },
                    { k: "Drop-off step", v: `Step ${m.drop_off_step + 1}`, vc: "#202124" },
                  ].map(({ k, v, vc }) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f1f3f4", paddingTop: 8 }}>
                      <span style={{ fontSize: 12, color: "#80868b" }}>{k}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: vc }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 12, padding: 6, display: "flex", gap: 4 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 8,
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
                background: tab === t.id ? "#e8f0fe" : "transparent",
                color: tab === t.id ? "#1a73e8" : "#5f6368",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 16, padding: 28, boxShadow: "0 1px 3px rgba(60,64,67,0.08)" }}>
          {tab === "funnel" && <Funnel variants={metrics.by_variant} />}
          {tab === "segments" && (
            <SegmentBreakdown
              bySegment={metrics.by_segment ?? {}}
              byVariant={metrics.by_variant}
            />
          )}
          {tab === "hours" && <HoursLost metrics={metrics} />}
          {tab === "fixes" && <FixLoop studyId={studyId} variants={metrics.by_variant} />}
          {tab === "calibration" && <CalibrationChart />}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
