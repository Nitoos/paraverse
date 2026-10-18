import { useEffect, useRef, useState } from "react";
import { type StepEvent, streamSwarm, replayStudy } from "../api/client";
import AgentCard, { type AgentState } from "./AgentCard";
import ThoughtStream, { type ThoughtEvent } from "./ThoughtStream";

const DEMO_STUDY_ID = "cd388de5-cbe0-4b98-8aa7-abea51c7f503";
const MAX_THOUGHTS = 200;

interface Props {
  studyId: string;
  onComplete: () => void;
}

export default function SwarmWall({ studyId, onComplete }: Props) {
  const [agents, setAgents] = useState<Record<string, AgentState>>({});
  const [thoughts, setThoughts] = useState<ThoughtEvent[]>([]);
  const [, setDoneCount] = useState(0);
  const [phase, setPhase] = useState<"connecting" | "starting" | "running">("connecting");
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const isDemo = studyId === DEMO_STUDY_ID;
    const connect = isDemo ? replayStudy : streamSwarm;
    if (isDemo) setPhase("starting");

    const es = connect(studyId, (ev: StepEvent) => {
      if ((ev as any).type === "run_starting") { setPhase("starting"); return; }

      if (ev.type === "step" && ev.thought) {
        const thought: ThoughtEvent = {
          agentId: ev.agent_id,
          segment: ev.persona_segment ?? "unknown",
          action: ev.action ?? "",
          thought: ev.thought,
          confused: !!ev.confused,
          timestamp: Date.now(),
        };
        setThoughts((prev) => {
          const next = [...prev, thought];
          return next.length > MAX_THOUGHTS ? next.slice(next.length - MAX_THOUGHTS) : next;
        });
      }

      setAgents((prev) => {
        const existing = prev[ev.agent_id] ?? {
          agentId: ev.agent_id,
          segment: ev.persona_segment ?? "unknown",
          steps: [],
          done: false,
        };
        if (ev.type === "step") {
          setPhase("running");
          return { ...prev, [ev.agent_id]: { ...existing, steps: [...existing.steps, ev] } };
        }
        if (ev.type === "terminal") {
          setDoneCount((c) => c + 1);
          return { ...prev, [ev.agent_id]: { ...existing, done: true, outcome: ev.outcome } };
        }
        return prev;
      });
    });

    esRef.current = es;
    return () => es.close();
  }, [studyId]);

  const agentList = Object.values(agents);
  const allDone = agentList.length > 0 && agentList.every((a) => a.done);
  const completedCount = agentList.filter((a) => a.outcome === "completed").length;
  const abandonedCount = agentList.filter((a) => a.done && a.outcome !== "completed").length;
  const runningCount = agentList.filter((a) => !a.done).length;

  useEffect(() => {
    if (allDone) { esRef.current?.close(); }
  }, [allDone]);

  const handleSkip = () => { esRef.current?.close(); onComplete(); };
  const handleGenerateReport = () => { esRef.current?.close(); onComplete(); };

  const progressPct = agentList.length > 0
    ? (agentList.filter((a) => a.done).length / agentList.length) * 100
    : 0;

  const hasAgents = agentList.length > 0;

  return (
    <div style={{ height: "100vh", overflow: "hidden", background: "#f8f9fa", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid #e8eaed",
        padding: "0 24px",
        height: 64,
        display: "flex",
        alignItems: "center",
        gap: 16,
        position: "sticky",
        top: 0,
        zIndex: 10,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #1a73e8, #34a853)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>P</span>
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#202124" }}>Swarm Wall</p>
            <p style={{ margin: 0, fontSize: 11, color: "#5f6368" }}>
              {agentList.length} agents · {completedCount} done · {abandonedCount} abandoned · {runningCount} running
            </p>
          </div>
        </div>

        <div style={{ flex: 1, margin: "0 24px" }}>
          <div style={{ height: 6, background: "#e8eaed", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              borderRadius: 4,
              background: allDone ? "#34a853" : "linear-gradient(90deg, #1a73e8, #34a853)",
              width: `${progressPct}%`,
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>

        {!allDone && agentList.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34a853", animation: "livepulse 1.4s ease-in-out infinite" }} />
            <span style={{ fontSize: 12, color: "#34a853", fontWeight: 600 }}>Live</span>
          </div>
        )}

        {allDone && (
          <button
            onClick={handleGenerateReport}
            style={{
              background: "#1a73e8",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(26,115,232,0.35)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Generate Report →
          </button>
        )}

        {!allDone && phase === "starting" && agentList.length === 0 && (
          <button
            onClick={handleSkip}
            style={{ fontSize: 12, color: "#1a73e8", background: "none", border: "1px solid #1a73e8", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}
          >
            Skip to report →
          </button>
        )}
      </div>

      {/* Empty / loading state */}
      {!hasAgents && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12 }}>
          <div style={{ width: 48, height: 48, border: "3px solid #e8eaed", borderTopColor: "#1a73e8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "#5f6368", fontSize: 14, margin: 0 }}>
            {phase === "connecting" ? "Connecting to swarm…" : "Launching agents — first actions incoming…"}
          </p>
        </div>
      )}

      {/* Two-column layout */}
      {hasAgents && (
        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

          {/* Left: agent grid */}
          <div style={{ flex: "0 0 68%", overflowY: "auto", padding: 20, minHeight: 0 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
              gap: 14,
            }}>
              {agentList.map((agent) => (
                <AgentCard key={agent.agentId} agent={agent} />
              ))}
            </div>
          </div>

          {/* Right: thought stream */}
          <div style={{
            flex: "0 0 32%",
            borderLeft: "1px solid #e8eaed",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
          }}>
            {/* Panel header */}
            <div style={{
              padding: "14px 16px",
              borderBottom: "1px solid #e8eaed",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34a853", animation: "livepulse 1.4s ease-in-out infinite" }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: "#202124" }}>Agent Feed</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#9aa0a6", background: "#f1f3f4", padding: "2px 8px", borderRadius: 10 }}>
                {thoughts.length} events
              </span>
            </div>

            {/* Scrolling feed */}
            <ThoughtStream events={thoughts} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes livepulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
      `}</style>
    </div>
  );
}
