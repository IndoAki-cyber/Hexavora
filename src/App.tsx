import { useState } from "react";
import { MotionConfig } from "framer-motion";
import BootScreen from "./components/boot/BootScreen";
import SiteShell from "./components/SiteShell";

export default function App() {
  /** site is fading in underneath the overlay */
  const [revealed, setRevealed] = useState(false);
  /** overlay choreography finished — unmount it */
  const [bootDone, setBootDone] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-void text-ink" aria-busy={!bootDone}>
        <SiteShell revealed={revealed} />
        {!bootDone && (
          <BootScreen onReveal={() => setRevealed(true)} onDone={() => setBootDone(true)} />
        )}
      </div>
    </MotionConfig>
  );
}
