import { type StepEvent, screenshotUrl } from "../api/client";

const SEGMENT_COLORS: Record<string, string> = {
  new_hire: "bg-blue-600",
  power_user: "bg-green-600",
  non_native: "bg-yellow-600",
  frontline_mobile: "bg-orange-600",
  low_vision: "bg-purple-600",
  occasional: "bg-pink-600",
};

interface AgentState {
  agentId: string;
  segment: string;
  steps: StepEvent[];
  outcome?: string;
  done: boolean;
}

interface Props {
  agent: AgentState;
}

export default function AgentCard({ agent }: Props) {
  const latest = agent.steps[agent.steps.length - 1];
  const colorClass = SEGMENT_COLORS[agent.segment] ?? "bg-gray-600";
  const screenshotPath = latest?.screenshot_path;

  const statusLabel = agent.done
    ? agent.outcome === "completed"
      ? "✓ Done"
      : agent.outcome === "abandoned"
      ? "✗ Abandoned"
      : `✗ ${agent.outcome ?? "ended"}`
    : `Step ${(latest?.step_index ?? 0) + 1}`;

  const borderColor = agent.done
    ? agent.outcome === "completed"
      ? "border-green-700"
      : "border-red-800"
    : latest?.confused
    ? "border-yellow-600"
    : "border-gray-700";

  return (
    <div className={`bg-gray-900 rounded-xl border ${borderColor} overflow-hidden flex flex-col`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${colorClass}`}>
          {agent.segment.replace("_", " ")}
        </span>
        <span className="text-xs text-gray-400 ml-auto">{statusLabel}</span>
      </div>

      <div className="relative aspect-video bg-gray-950 flex items-center justify-center overflow-hidden">
        {screenshotPath ? (
          <img
            src={screenshotUrl(screenshotPath)}
            alt="agent view"
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="text-gray-700 text-xs">waiting…</div>
        )}
        {!agent.done && (
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        )}
      </div>

      {latest?.thought && (
        <div className="px-3 py-2 text-xs text-gray-400 italic line-clamp-2">
          "{latest.thought}"
        </div>
      )}

      {latest?.confused && !agent.done && (
        <div className="px-3 pb-2 text-xs text-yellow-400 font-medium">⚠ confused</div>
      )}
    </div>
  );
}

export type { AgentState };
