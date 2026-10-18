import { useEffect, useRef, useState } from "react";
import { type StepEvent, streamSwarm } from "../api/client";
import AgentCard, { type AgentState } from "./AgentCard";

interface Props {
  studyId: string;
  onComplete: () => void;
}

export default function SwarmWall({ studyId, onComplete }: Props) {
  const [agents, setAgents] = useState<Record<string, AgentState>>({});
  const [, setDoneCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = streamSwarm(studyId, (ev: StepEvent) => {
      setAgents((prev) => {
        const existing = prev[ev.agent_id] ?? {
          agentId: ev.agent_id,
          segment: ev.persona_segment ?? "unknown",
          steps: [],
          done: false,
        };

        if (ev.type === "step") {
          return {
            ...prev,
            [ev.agent_id]: { ...existing, steps: [...existing.steps, ev] },
          };
        }

        if (ev.type === "terminal") {
          setDoneCount((c) => c + 1);
          return {
            ...prev,
            [ev.agent_id]: { ...existing, done: true, outcome: ev.outcome },
          };
        }

        return prev;
      });
    });

    esRef.current = es;
    return () => es.close();
  }, [studyId]);

  const agentList = Object.values(agents);
  const allDone = agentList.length > 0 && agentList.every((a) => a.done);

  useEffect(() => {
    if (allDone) {
      esRef.current?.close();
      setTimeout(onComplete, 1500);
    }
  }, [allDone, onComplete]);

  const completedCount = agentList.filter((a) => a.outcome === "completed").length;
  const abandonedCount = agentList.filter((a) => a.done && a.outcome !== "completed").length;

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Swarm Wall</h2>
          <p className="text-gray-400 text-sm mt-1">
            {agentList.length} agents · {completedCount} completed · {abandonedCount} abandoned
          </p>
        </div>
        {allDone && (
          <div className="bg-green-900/40 border border-green-700 rounded-lg px-4 py-2 text-green-300 text-sm font-medium">
            All agents done — loading report…
          </div>
        )}
        {!allDone && agentList.length > 0 && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Running
          </div>
        )}
      </div>

      {agentList.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-600 text-sm">
          Waiting for agents to start…
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {agentList.map((agent) => (
          <AgentCard key={agent.agentId} agent={agent} />
        ))}
      </div>
    </div>
  );
}
