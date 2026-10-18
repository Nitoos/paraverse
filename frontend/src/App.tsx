import { useState } from "react";
import Landing from "./components/Landing";
import Setup from "./components/Setup";
import SwarmWall from "./components/SwarmWall";
import Report from "./components/Report";

type Screen = "landing" | "setup" | "swarm" | "report";

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [studyId, setStudyId] = useState<string | null>(null);

  function handleStudyCreated(id: string, _variantMap?: Record<string, string>) {
    setStudyId(id);
    setScreen("swarm");
  }

  function handleLoadDemo(id: string) {
    setStudyId(id);
    setScreen("swarm");
  }

  function handleSwarmComplete() {
    setScreen("report");
  }

  function handleRestart() {
    setStudyId(null);
    setScreen("landing");
  }

  return (
    <>
      {screen === "landing" && (
        <Landing onStart={() => setScreen("setup")} onDemo={handleLoadDemo} />
      )}
      {screen === "setup" && (
        <Setup onStudyCreated={handleStudyCreated} onLoadDemo={handleLoadDemo} />
      )}
      {screen === "swarm" && studyId && (
        <SwarmWall studyId={studyId} onComplete={handleSwarmComplete} />
      )}
      {screen === "report" && studyId && (
        <Report studyId={studyId} onRestart={handleRestart} />
      )}
    </>
  );
}
