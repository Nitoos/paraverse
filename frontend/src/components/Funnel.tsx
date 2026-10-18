import { type VariantMetrics } from "../api/client";

interface Props {
  variants: VariantMetrics[];
}

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

export default function Funnel({ variants }: Props) {
  const sorted = [...variants].sort((a, b) => b.completion_rate - a.completion_rate);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Completion Funnel</h3>
      {sorted.map((m, i) => (
        <div key={m.variant_id}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300 capitalize">{m.variant_label}</span>
            <span className="text-white font-semibold">{(m.completion_rate * 100).toFixed(0)}%</span>
          </div>
          <div className="h-6 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(m.completion_rate * 100).toFixed(1)}%`,
                backgroundColor: COLORS[i % COLORS.length],
              }}
            />
          </div>
          <div className="flex gap-4 mt-1 text-xs text-gray-500">
            <span>avg {m.avg_time_on_task.toFixed(1)} sec</span>
            <span>drop-off step {m.drop_off_step}</span>
            <span>{(m.confusion_rate * 100).toFixed(0)}% confused</span>
          </div>
        </div>
      ))}
    </div>
  );
}
