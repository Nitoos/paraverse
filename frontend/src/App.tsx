import { useState } from "react";
import Setup from "./components/Setup";
import SwarmWall from "./components/SwarmWall";
import Report from "./components/Report";

type Screen = "setup" | "swarm" | "report";

export default function App() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [studyId, setStudyId] = useState<string | null>(null);

  function handleStudyCreated(id: string) {
    setStudyId(id);
    setScreen("swarm");
  }

  function handleSwarmComplete() {
    setScreen("report");
  }

  function handleRestart() {
    setStudyId(null);
    setScreen("setup");
  }

  return (
    <>
      {screen === "setup" && <Setup onStudyCreated={handleStudyCreated} />}
      {screen === "swarm" && studyId && (
        <SwarmWall studyId={studyId} onComplete={handleSwarmComplete} />
      )}
      {screen === "report" && studyId && (
        <Report studyId={studyId} onRestart={handleRestart} />
      )}
    </>
  );
}
