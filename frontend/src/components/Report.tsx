import { useEffect, useState } from "react";
import { type MetricsResponse, getMetrics } from "../api/client";
import Funnel from "./Funnel";
import HoursLost from "./HoursLost";
import FixLoop from "./FixLoop";
import CalibrationChart from "./CalibrationChart";

interface Props {
  studyId: string;
  onRestart: () => void;
}

export default function Report({ studyId, onRestart }: Props) {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"funnel" | "hours" | "fixes" | "calibration">("funnel");

  useEffect(() => {
    getMetrics(studyId)
      .then(setMetrics)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [studyId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Computing metrics…</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error ?? "No metrics found"}</p>
          <button onClick={onRestart} className="text-indigo-400 underline text-sm">
            Start over
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "funnel", label: "Funnel" },
    { id: "hours", label: "Hours Lost" },
    { id: "fixes", label: "Fix Loop" },
    { id: "calibration", label: "Calibration" },
  ] as const;

  const winner = [...metrics.by_variant].sort((a, b) => b.completion_rate - a.completion_rate)[0];

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Study Report</h2>
            <p className="text-gray-400 text-sm mt-1">
              {metrics.by_variant.length} variants · winner:{" "}
              <span className="text-green-400 font-semibold capitalize">{winner?.variant_label}</span>
            </p>
          </div>
          <button
            onClick={onRestart}
            className="text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg transition-colors"
          >
            New Study
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {metrics.by_variant.map((m) => (
            <div
              key={m.variant_id}
              className="bg-gray-900 rounded-xl p-4 border border-gray-800"
            >
              <p className="text-gray-400 text-xs capitalize mb-1">{m.variant_label}</p>
              <p className="text-2xl font-bold text-white">
                {(m.completion_rate * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">completion</p>
              <div className="mt-3 space-y-1 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>avg time</span>
                  <span className="text-white">{m.avg_time_on_task.toFixed(0)}s</span>
                </div>
                <div className="flex justify-between">
                  <span>drop-off step</span>
                  <span className="text-white">{m.drop_off_step}</span>
                </div>
                <div className="flex justify-between">
                  <span>confused</span>
                  <span className="text-yellow-400">{(m.confusion_rate * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-xl border border-gray-800">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                tab === t.id
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          {tab === "funnel" && <Funnel variants={metrics.by_variant} />}
          {tab === "hours" && <HoursLost metrics={metrics} />}
          {tab === "fixes" && <FixLoop studyId={studyId} variants={metrics.by_variant} />}
          {tab === "calibration" && <CalibrationChart />}
        </div>
      </div>
    </div>
  );
}
