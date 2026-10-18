import { useEffect, useRef } from "react";

export interface ThoughtEvent {
  agentId: string;
  segment: string;
  action: string;
  thought: string;
  confused: boolean;
  timestamp: number;
}

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

const ACTION_LABELS: Record<string, string> = {
  type: "Typing",
  click: "Clicking",
  scroll: "Scrolling",
  wait: "Waiting",
  give_up: "Gave up",
  goal_reached: "Completed",
};

interface Props {
  events: ThoughtEvent[];
}

export default function ThoughtStream({ events }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 0,
      overflowY: "auto",
      flex: 1,
    }}>
      {events.length === 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 120,
          color: "#9aa0a6",
          fontSize: 13,
        }}>
          Waiting for agent actions…
        </div>
      )}

      {events.map((ev, i) => {
        const segColor = SEGMENT_COLORS[ev.segment.toLowerCase()] ?? SEGMENT_COLORS[ev.segment] ?? "#5f6368";
        const actionColor = ACTION_COLORS[ev.action] ?? "#5f6368";
        const actionLabel = ACTION_LABELS[ev.action] ?? ev.action;
        const isLast = i === events.length - 1;

        return (
          <div
            key={`${ev.agentId}-${ev.timestamp}-${i}`}
            style={{
              borderLeft: `3px solid ${segColor}`,
              padding: "10px 14px",
              borderBottom: "1px solid #f1f3f4",
              background: isLast ? `${segColor}06` : "#fff",
              transition: "background 0.3s",
            }}
          >
            {/* Top row: segment + action pill + confused */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: segColor,
                textTransform: "capitalize",
                letterSpacing: "0.02em",
              }}>
                {ev.segment.replace(/_/g, " ")}
              </span>

              <div style={{
                background: `${actionColor}15`,
                border: `1px solid ${actionColor}30`,
                borderRadius: 10,
                padding: "1px 7px",
                fontSize: 9,
                fontWeight: 700,
                color: actionColor,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}>
                {actionLabel}
              </div>

              {ev.confused && (
                <div style={{
                  background: "#fef7e0",
                  border: "1px solid #f9ab0040",
                  borderRadius: 10,
                  padding: "1px 7px",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#e37400",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}>
                  Confused
                </div>
              )}
            </div>

            {/* Thought text */}
            <p style={{
              margin: 0,
              fontSize: 12,
              color: "#3c4043",
              lineHeight: 1.5,
            }}>
              {ev.thought}
            </p>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
