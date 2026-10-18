import { type MetricsResponse } from "../api/client";

interface Props {
  metrics: MetricsResponse;
}

export default function HoursLost({ metrics }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        Productivity Impact
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-3xl font-bold text-red-400">
            {metrics.hours_lost_per_year.toFixed(0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">hours lost per year (20k employees)</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-3xl font-bold text-green-400">
            {metrics.support_tickets_avoided.toFixed(0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">support tickets avoided</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-3xl font-bold text-yellow-400">
            {metrics.extra_minutes_vs_baseline.toFixed(1)}
          </p>
          <p className="text-xs text-gray-400 mt-1">extra minutes vs baseline</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-3xl font-bold text-indigo-400">
            {(metrics.confusion_rate * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">average confusion rate</p>
        </div>
      </div>
    </div>
  );
}
