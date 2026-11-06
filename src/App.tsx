import { useState } from "react";
import BootScreen from "./components/boot/BootScreen";

export default function App() {
  /** overlay choreography finished — unmount it */
  const [bootDone, setBootDone] = useState(false);

  return (
    <div className="min-h-screen bg-void text-ink" aria-busy={!bootDone}>
      {/* clean stage — the main experience is staged for the next phase */}
      <div className="relative min-h-screen" data-stage="hexavora" />

      {!bootDone && (
        <BootScreen onReveal={() => {}} onDone={() => setBootDone(true)} />
      )}
    </div>
  );
}
