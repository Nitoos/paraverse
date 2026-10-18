import { type StepEvent, screenshotUrl } from "../api/client";

const SEGMENT_COLORS: Record<string, string> = {
  "new hire": "#1a73e8",
  "power user": "#34a853",
  "non-native speaker": "#f9ab00",
  "frontline mobile": "#fa7b17",
  "low vision": "#a142f4",
  "occasional user": "#24c1e0",
  new_hire: "#1a73e8",
  power_user: "#34a853",
  non_native: "#f9ab00",
  frontline_mobile: "#fa7b17",
  low_vision: "#a142f4",
  occasional: "#24c1e0",
};

const ACTION_COLORS: Record<string, string> = {
  type: "#1a73e8",
  click: "#34a853",
  scroll: "#5f6368",
  wait: "#9aa0a6",
  give_up: "#ea4335",
  goal_reached: "#34a853",
};

const ACTION_LABEL: Record<string, string> = {
  type: "Typing",
  click: "Clicking",
  scroll: "Scrolling",
  wait: "Waiting",
  give_up: "Gave up",
  goal_reached: "Completed",
};

interface AgentState {
  agentId: string;
  segment: string;
  steps: StepEvent[];
  outcome?: string;
  done: boolean;
}

interface Props { agent: AgentState; }

export default function AgentCard({ agent }: Props) {
  const latest = agent.steps[agent.steps.length - 1];
  const color = SEGMENT_COLORS[agent.segment.toLowerCase()] ?? SEGMENT_COLORS[agent.segment] ?? "#5f6368";
  const screenshotPath = latest?.screenshot_path;

  const isSuccess = agent.done && agent.outcome === "completed";
  const isFailed = agent.done && agent.outcome !== "completed";
  const isConfused = !agent.done && !!latest?.confused;

  const actionColor = latest?.action ? (ACTION_COLORS[latest.action] ?? "#5f6368") : "#9aa0a6";
  const actionLabel = latest?.action ? (ACTION_LABEL[latest.action] ?? latest.action) : "Waiting";
  const stepNum = (latest?.step_index ?? 0) + 1;
  const totalSteps = agent.steps.length;

  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 1px 4px rgba(60,64,67,0.10), 0 1px 2px rgba(60,64,67,0.06)",
      display: "flex",
      flexDirection: "column",
      border: `1px solid ${isSuccess ? "#34a85328" : isFailed ? "#ea433520" : "#e8eaed"}`,
      transition: "box-shadow 0.2s",
    }}>
      {/* Segment header */}
      <div style={{
        background: color + "12",
        borderBottom: `1px solid ${color}22`,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: "capitalize", letterSpacing: "0.01em" }}>
            {agent.segment.replace(/_/g, " ")}
          </span>
        </div>
        {/* Step dots */}
        <div style={{ display: "flex", gap: 3 }}>
          {Array.from({ length: Math.min(totalSteps, 8) }).map((_, i) => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: "50%",
              background: i < totalSteps - 1 ? color + "60" : color,
              opacity: i >= totalSteps ? 0.2 : 1,
            }} />
          ))}
          {totalSteps > 8 && <span style={{ fontSize: 9, color, fontWeight: 700 }}>+{totalSteps - 8}</span>}
        </div>
      </div>

      {/* Visual area */}
      <div style={{
        aspectRatio: "16/9",
        background: "#f8f9fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
      }}>
        {screenshotPath ? (
          <img
            src={screenshotUrl(screenshotPath)}
            alt="agent view"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 12 }}>
            {/* Action pill */}
            <div style={{
              background: actionColor + "14",
              border: `1px solid ${actionColor}30`,
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 700,
              color: actionColor,
              letterSpacing: "0.03em",
            }}>
              {actionLabel}
            </div>
            {/* Step counter */}
            {!agent.done && (
              <span style={{ fontSize: 10, color: "#9aa0a6" }}>Step {stepNum}</span>
            )}
          </div>
        )}

        {/* Confused overlay */}
        {isConfused && (
          <div style={{
            position: "absolute", top: 6, left: 6,
            background: "#f9ab00",
            borderRadius: 4,
            padding: "2px 7px",
            fontSize: 9,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "0.04em",
          }}>
            CONFUSED
          </div>
        )}

        {/* Live pulse */}
        {!agent.done && latest && (
          <div style={{
            position: "absolute", top: 6, right: 6,
            width: 6, height: 6, borderRadius: "50%",
            background: "#34a853",
            boxShadow: "0 0 0 2px #34a85330",
            animation: "pulse 1.4s ease-in-out infinite",
          }} />
        )}
      </div>

      {/* Status bar */}
      <div style={{
        padding: "8px 12px",
        borderTop: "1px solid #f1f3f4",
        display: "flex",
        alignItems: "center",
        gap: 8,
        minHeight: 36,
      }}>
        {isSuccess && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#e6f4ea", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width={8} height={8} viewBox="0 0 8 8"><polyline points="1,4 3,6 7,2" stroke="#34a853" strokeWidth={1.5} fill="none" strokeLinecap="round" /></svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#137333" }}>Task completed</span>
          </div>
        )}
        {isFailed && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fce8e6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width={8} height={8} viewBox="0 0 8 8"><line x1="2" y1="2" x2="6" y2="6" stroke="#ea4335" strokeWidth={1.5} strokeLinecap="round" /><line x1="6" y1="2" x2="2" y2="6" stroke="#ea4335" strokeWidth={1.5} strokeLinecap="round" /></svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#c5221f" }}>
              {agent.outcome === "abandoned" ? "Abandoned" : agent.outcome ?? "Ended"}
            </span>
          </div>
        )}
        {!agent.done && latest?.thought && (
          <p style={{
            margin: 0,
            fontSize: 10,
            color: "#5f6368",
            flex: 1,
            fontStyle: "italic",
            lineHeight: 1.4,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}>
            {latest.thought}
          </p>
        )}
        {!agent.done && !latest && (
          <span style={{ fontSize: 10, color: "#bdc1c6" }}>Connecting…</span>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
    </div>
  );
}

export type { AgentState };
