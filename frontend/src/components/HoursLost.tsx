import { type MetricsResponse } from "../api/client";

interface Props {
  metrics: MetricsResponse[];
}

export default function HoursLost({ metrics }: Props) {
  const worst = [...metrics].sort((a, b) => b.hours_lost_per_1000 - a.hours_lost_per_1000);
  const best = metrics.find((m) => m.variant_name === "baseline") ?? metrics[0];
  const maxHours = worst[0]?.hours_lost_per_1000 ?? 1;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        Hours Lost per 1 000 Submissions
      </h3>
      {worst.map((m) => {
        const pct = (m.hours_lost_per_1000 / maxHours) * 100;
        const isBaseline = m.variant_name === "baseline";
        return (
          <div key={m.variant_id}>
            <div className="flex justify-between text-sm mb-1">
              <span className={`capitalize ${isBaseline ? "text-gray-400" : "text-white"}`}>
                {m.variant_name}
              </span>
              <span className="text-white font-semibold">
                {m.hours_lost_per_1000.toFixed(1)} hrs
              </span>
            </div>
            <div className="h-5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct.toFixed(1)}%`,
                  backgroundColor: isBaseline ? "#6366f1" : m.hours_lost_per_1000 > (best?.hours_lost_per_1000 ?? 0) * 1.5 ? "#ef4444" : "#f59e0b",
                }}
              />
            </div>
            {m.support_tickets_avoided !== undefined && m.variant_name !== "baseline" && (
              <p className="text-xs text-gray-500 mt-0.5">
                {m.support_tickets_avoided.toFixed(0)} support tickets avoided vs baseline
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
