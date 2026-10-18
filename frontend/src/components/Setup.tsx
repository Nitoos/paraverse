import { useState } from "react";
import { createStudy, type StudyPayload } from "../api/client";

const DEFAULT_SEGMENTS: Record<string, number> = {
  new_hire: 2,
  power_user: 2,
  non_native: 1,
  frontline_mobile: 1,
  low_vision: 1,
  occasional: 1,
};

const BASE = "http://localhost:3001";

const DEFAULT_VARIANTS: Record<string, string> = {
  baseline: `${BASE}/baseline/`,
  flawed: `${BASE}/flawed/`,
  fixed: `${BASE}/fixed/`,
};

interface Props {
  onStudyCreated: (studyId: string, variantMap: Record<string, string>) => void;
}

export default function Setup({ onStudyCreated }: Props) {
  const [taskGoal, setTaskGoal] = useState("Submit an expense report for a team dinner on 2024-12-01 for $150.");
  const [segments, setSegments] = useState(DEFAULT_SEGMENTS);
  const [variants, setVariants] = useState(DEFAULT_VARIANTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAgents = Object.values(segments).reduce((s, n) => s + n, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: StudyPayload = {
        task_goal: taskGoal,
        segment_mix: segments,
        variant_urls: variants,
      };
      const res = await createStudy(payload);
      const variantMap: Record<string, string> = {};
      for (const v of res.variants) variantMap[v.id] = v.name;
      onStudyCreated(res.study_id, variantMap);
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center p-8 bg-gray-950">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Paraverse</h1>
          <p className="text-gray-400">Synthetic workforce UX simulation</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <label className="block text-sm font-medium text-gray-300 mb-2">Task Goal</label>
            <textarea
              value={taskGoal}
              onChange={(e) => setTaskGoal(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-300">Agent Mix</label>
              <span className="text-xs text-gray-500">{totalAgents} agents total</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(segments).map(([seg, count]) => (
                <div key={seg} className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 w-36 capitalize">{seg.replace("_", " ")}</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={count}
                    onChange={(e) =>
                      setSegments((s) => ({ ...s, [seg]: parseInt(e.target.value) || 0 }))
                    }
                    className="w-16 bg-gray-800 text-white text-center rounded-lg px-2 py-1 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <label className="block text-sm font-medium text-gray-300 mb-4">Variant URLs</label>
            <div className="space-y-3">
              {Object.entries(variants).map(([name, url]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 w-20 capitalize">{name}</span>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setVariants((v) => ({ ...v, [name]: e.target.value }))}
                    className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || totalAgents === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? "Launching study…" : `Launch ${totalAgents} agents`}
          </button>
        </form>
      </div>
    </div>
  );
}
