import { lazy, Suspense, useState } from "react";
import BootScreen from "./components/boot/BootScreen";

/**
 * Hero (and three.js with it) loads as its own chunk, fetched in parallel
 * with the boot sequence — it mounts the moment the shutters open.
 */
const Hero = lazy(() => import("./components/Hero"));

export default function App() {
  /** boot reveal started — hero starts building underneath the shutters */
  const [revealed, setRevealed] = useState(false);
  /** overlay choreography finished — unmount it */
  const [bootDone, setBootDone] = useState(false);

  return (
    <div className="min-h-screen bg-void text-ink" aria-busy={!bootDone}>
      {revealed && (
        <Suspense fallback={null}>
          <Hero />
        </Suspense>
      )}
      {!bootDone && (
        <BootScreen onReveal={() => setRevealed(true)} onDone={() => setBootDone(true)} />
      )}
    </div>
  );
}
