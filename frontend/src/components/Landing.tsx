const DEMO_STUDY_ID = "cd388de5-cbe0-4b98-8aa7-abea51c7f503";

interface Props {
  onStart: () => void;
  onDemo: (id: string) => void;
}

const FEATURES = [
  {
    color: "#1a73e8",
    title: "AI Persona Swarm",
    desc: "Simulate New Hires, Power Users, Mobile workers, Non-Native Speakers and more — all navigating your real UI simultaneously.",
    shape: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="14" r="7" fill="#1a73e8" fillOpacity="0.15" stroke="#1a73e8" strokeWidth="1.5"/>
        <circle cx="10" cy="36" r="5" fill="#1a73e8" fillOpacity="0.1" stroke="#1a73e8" strokeWidth="1.5"/>
        <circle cx="24" cy="36" r="5" fill="#1a73e8" fillOpacity="0.1" stroke="#1a73e8" strokeWidth="1.5"/>
        <circle cx="38" cy="36" r="5" fill="#1a73e8" fillOpacity="0.1" stroke="#1a73e8" strokeWidth="1.5"/>
        <line x1="24" y1="21" x2="10" y2="31" stroke="#1a73e8" strokeWidth="1" strokeOpacity="0.4"/>
        <line x1="24" y1="21" x2="24" y2="31" stroke="#1a73e8" strokeWidth="1" strokeOpacity="0.4"/>
        <line x1="24" y1="21" x2="38" y2="31" stroke="#1a73e8" strokeWidth="1" strokeOpacity="0.4"/>
      </svg>
    ),
  },
  {
    color: "#34a853",
    title: "Instant Friction Report",
    desc: "See exactly which step breaks which segment and why — funnel drop-off, confusion rate, hours lost per year.",
    shape: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="6" y="32" width="8" height="10" rx="2" fill="#34a853" fillOpacity="0.2" stroke="#34a853" strokeWidth="1.5"/>
        <rect x="20" y="22" width="8" height="20" rx="2" fill="#34a853" fillOpacity="0.35" stroke="#34a853" strokeWidth="1.5"/>
        <rect x="34" y="12" width="8" height="30" rx="2" fill="#34a853" fillOpacity="0.6" stroke="#34a853" strokeWidth="1.5"/>
        <polyline points="10,30 24,20 38,10" stroke="#34a853" strokeWidth="1.5" strokeDasharray="3,2"/>
      </svg>
    ),
  },
  {
    color: "#fa7b17",
    title: "Fix Loop",
    desc: "Get ranked, actionable fixes with predicted impact. Know what to build before your next sprint.",
    shape: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M24 8 A16 16 0 1 1 8 24" stroke="#fa7b17" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <polyline points="8,18 8,24 14,24" stroke="#fa7b17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="24" cy="24" r="5" fill="#fa7b17" fillOpacity="0.2" stroke="#fa7b17" strokeWidth="1.5"/>
      </svg>
    ),
  },
];

const STEPS = [
  { n: "1", title: "Paste your UI URL", desc: "Point Paraverse at any web-based UI — internal tools, prototypes, production." },
  { n: "2", title: "Watch AI agents work", desc: "AI personas navigate your interface, narrate their thinking, and surface every friction point in real time." },
  { n: "3", title: "Get a ranked fix report", desc: "Receive a prioritised list of UX fixes with estimated hours saved per year — ready for your next sprint." },
];

export default function Landing({ onStart, onDemo }: Props) {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #e8eaed",
        padding: "0 40px",
        height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #1a73e8 0%, #34a853 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 800, letterSpacing: "-0.5px" }}>P</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#202124", letterSpacing: "-0.3px" }}>Paraverse</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => onDemo(DEMO_STUDY_ID)}
            style={{ background: "none", border: "1px solid #dadce0", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, color: "#3c4043", cursor: "pointer" }}
          >
            View Demo
          </button>
          <button
            onClick={onStart}
            style={{ background: "#1a73e8", border: "none", borderRadius: 8, padding: "7px 18px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}
          >
            Run a Study
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        padding: "96px 40px 80px",
        maxWidth: 960,
        margin: "0 auto",
        textAlign: "center",
      }}>
        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#e8f0fe", border: "1px solid #c5d9f7",
          borderRadius: 20, padding: "5px 14px", marginBottom: 28,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1a73e8" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#1a73e8", letterSpacing: "0.04em" }}>
            AI-POWERED UX SIMULATION
          </span>
        </div>

        <h1 style={{
          fontSize: "clamp(36px, 5vw, 58px)",
          fontWeight: 800,
          color: "#202124",
          lineHeight: 1.12,
          letterSpacing: "-1.5px",
          margin: "0 0 24px",
          maxWidth: 760,
          marginLeft: "auto",
          marginRight: "auto",
        }}>
          Know your UX is broken{" "}
          <span style={{ color: "#1a73e8" }}>before</span>{" "}
          your users do
        </h1>

        <p style={{
          fontSize: 19,
          color: "#5f6368",
          lineHeight: 1.6,
          maxWidth: 580,
          margin: "0 auto 40px",
          fontWeight: 400,
        }}>
          AI agents simulate your workforce completing real tasks — exposing friction, confusion and drop-off before it costs you thousands of hours a year.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={onStart}
            style={{
              background: "#1a73e8",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "14px 28px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(26,115,232,0.35)",
              letterSpacing: "-0.2px",
            }}
          >
            Run a Study  →
          </button>
          <button
            onClick={() => onDemo(DEMO_STUDY_ID)}
            style={{
              background: "#fff",
              color: "#3c4043",
              border: "1px solid #dadce0",
              borderRadius: 10,
              padding: "14px 28px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            View Live Demo
          </button>
        </div>
      </section>

      {/* Stats banner */}
      <section style={{
        background: "linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)",
        padding: "28px 40px",
      }}>
        <div style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-around",
          flexWrap: "wrap",
          gap: 24,
        }}>
          {[
            { val: "23,058", label: "person-hours identified at risk per year" },
            { val: "0% → 75%", label: "completion rate recoverable" },
            { val: "4 fixes", label: "ranked and prioritised in minutes" },
            { val: "5 segments", label: "of workforce persona simulated" },
          ].map(({ val, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>{val}</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "80px 40px", maxWidth: 960, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: 30, fontWeight: 700, color: "#202124", margin: "0 0 48px", letterSpacing: "-0.5px" }}>
          Everything you need to ship better UX
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              background: "#fff",
              border: "1px solid #e8eaed",
              borderRadius: 16,
              padding: 28,
              boxShadow: "0 1px 4px rgba(60,64,67,0.08)",
              borderTop: `3px solid ${f.color}`,
            }}>
              <div style={{ marginBottom: 16 }}>{f.shape}</div>
              <h3 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 700, color: "#202124" }}>{f.title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: "#5f6368", lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: "#f8f9fa", padding: "80px 40px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: 30, fontWeight: 700, color: "#202124", margin: "0 0 56px", letterSpacing: "-0.5px" }}>
            How it works
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32, position: "relative" }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "#1a73e8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(26,115,232,0.3)",
                  flexShrink: 0,
                }}>
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>{s.n}</span>
                </div>
                <div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#202124" }}>{s.title}</h3>
                  <p style={{ margin: 0, fontSize: 14, color: "#5f6368", lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ padding: "80px 40px", textAlign: "center" }}>
        <div style={{
          maxWidth: 600,
          margin: "0 auto",
          background: "linear-gradient(135deg, #e8f0fe 0%, #e6f4ea 100%)",
          border: "1px solid #c5d9f7",
          borderRadius: 24,
          padding: "48px 40px",
        }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 800, color: "#202124", letterSpacing: "-0.5px" }}>
            Ready to find your friction?
          </h2>
          <p style={{ margin: "0 0 32px", fontSize: 15, color: "#5f6368" }}>
            Run your first study in under 2 minutes. No setup required.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={onStart}
              style={{
                background: "#1a73e8", color: "#fff", border: "none",
                borderRadius: 10, padding: "13px 28px",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 2px 10px rgba(26,115,232,0.3)",
              }}
            >
              Run a Study  →
            </button>
            <button
              onClick={() => onDemo(DEMO_STUDY_ID)}
              style={{
                background: "#fff", color: "#1a73e8",
                border: "1px solid #1a73e8",
                borderRadius: 10, padding: "13px 28px",
                fontSize: 15, fontWeight: 600, cursor: "pointer",
              }}
            >
              View Demo First
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e8eaed", padding: "20px 40px", display: "flex", justifyContent: "center" }}>
        <span style={{ fontSize: 12, color: "#9aa0a6" }}>Paraverse — Synthetic Workforce UX Simulation</span>
      </footer>
    </div>
  );
}
