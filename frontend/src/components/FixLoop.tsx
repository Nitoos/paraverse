import { useState } from "react";
import { type FixResponse, type VariantMetrics, suggestFixes } from "../api/client";

interface Props {
  studyId: string;
  variants: VariantMetrics[];
}

export default function FixLoop({ studyId, variants }: Props) {
  const [selectedVariant, setSelectedVariant] = useState(variants[0]?.variant_id ?? "");
  const [fixes, setFixes] = useState<FixResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    try {
      const result = await suggestFixes(studyId, selectedVariant);
      setFixes(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Fix Loop</h3>

      <div className="flex gap-3">
        <select
          value={selectedVariant}
          onChange={(e) => setSelectedVariant(e.target.value)}
          className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none"
        >
          {variants.map((m) => (
            <option key={m.variant_id} value={m.variant_id}>
              {m.variant_label} (step {m.drop_off_step} drop-off)
            </option>
          ))}
        </select>
        <button
          onClick={handleSuggest}
          disabled={loading || !selectedVariant}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? "Analyzing…" : "Suggest Fixes"}
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 rounded-lg px-3 py-2">{error}</div>
      )}

      {fixes.length > 0 && (
        <div className="space-y-3">
          {fixes.map((fix) => (
            <div key={fix.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-start gap-3">
                <span className="bg-indigo-900 text-indigo-300 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                  {fix.rank}
                </span>
                <div>
                  <p className="text-white text-sm font-medium">{fix.suggestion}</p>
                  <p className="text-gray-400 text-xs mt-1">{fix.expected_impact}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
