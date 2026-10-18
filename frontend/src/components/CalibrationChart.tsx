import { useEffect, useState } from "react";
import { type CalibrationResponse, getCalibration } from "../api/client";

const SEGMENT_LABELS: Record<string, string> = {
  new_hire: "New Hire",
  power_user: "Power User",
  non_native: "Non-Native",
  frontline_mobile: "Frontline Mobile",
  low_vision: "Low Vision",
  occasional: "Occasional",
};

export default function CalibrationChart() {
  const [cal, setCal] = useState<CalibrationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCalibration()
      .then(setCal)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <p className="text-red-400 text-sm">{error}</p>;
  if (!cal) return <p className="text-gray-500 text-sm">Loading calibration…</p>;

  const weights = cal.best_weights;
  const maxW = Math.max(...Object.values(weights));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Calibration Weights
        </h3>
        <div className="flex gap-4 text-xs">
          <span className="text-gray-400">
            Tuning acc: <span className="text-white font-semibold">{(cal.tuning_accuracy * 100).toFixed(0)}%</span>
          </span>
          <span className="text-gray-400">
            Holdout acc: <span className="text-white font-semibold">{(cal.holdout_accuracy * 100).toFixed(0)}%</span>
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(weights).map(([seg, w]) => {
          const pct = (w / maxW) * 100;
          return (
            <div key={seg}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">{SEGMENT_LABELS[seg] ?? seg}</span>
                <span className="text-white font-mono text-xs">{w.toFixed(2)}×</span>
              </div>
              <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${pct.toFixed(1)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-600">
        Grid search over {cal.n_combos_tried.toLocaleString()} combinations · {6} tuning rollouts · 2 held-out
      </p>
    </div>
  );
}
