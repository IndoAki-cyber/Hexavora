import { useCallback, useEffect, useRef, useState } from "react";
import HexaLogo, { Wordmark } from "./HexaLogo";
import ParticleField from "./ParticleField";
import BootLog from "./BootLog";
import StatusPanel from "./StatusPanel";
import {
  BOOT_END_MS,
  BOOT_LINES,
  STATUS_ONLINE,
  STATUS_PENDING,
  type StatusKey,
} from "../../lib/boot";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

type Phase = "boot" | "granted" | "exit";

interface BootScreenProps {
  /** fired when the reveal choreography starts (site fades in underneath) */
  onReveal: () => void;
  /** fired when the overlay can be unmounted */
  onDone: () => void;
}

export default function BootScreen({ onReveal, onDone }: BootScreenProps) {
  const reduced = usePrefersReducedMotion();

  const [lineCount, setLineCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("boot");
  const [statuses, setStatuses] = useState<Record<StatusKey, boolean>>(STATUS_PENDING);
  const [showSkip, setShowSkip] = useState(false);

  const targetPct = useRef(0);
  const dispPct = useRef(0);
  const pctEl = useRef<HTMLSpanElement>(null);
  const fillEl = useRef<HTMLDivElement>(null);
  const clockEl = useRef<HTMLSpanElement>(null);
  const memEl = useRef<HTMLSpanElement>(null);
  const timeouts = useRef<number[]>([]);
  const phaseRef = useRef<Phase>("boot");
  const exitingRef = useRef(false);
  const lastHexAt = useRef(0);
  const t0 = useRef(performance.now());

  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const startExit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    onRevealRef.current();
    setPhaseBoth("exit");
    window.setTimeout(() => onDoneRef.current(), reducedRef.current ? 380 : 950);
  }, [setPhaseBoth]);

  /* ---------- boot timeline ---------- */
  useEffect(() => {
    const tids: number[] = [];
    if (reduced) {
      // express boot: everything resolves almost immediately
      setLineCount(BOOT_LINES.length);
      setStatuses(STATUS_ONLINE);
      targetPct.current = 100;
      dispPct.current = 100;
      setPhaseBoth("granted");
      tids.push(window.setTimeout(startExit, 1100));
    } else {
      BOOT_LINES.forEach((line, i) => {
        tids.push(
          window.setTimeout(() => {
            setLineCount(i + 1);
            targetPct.current = line.pct;
            if (line.flag) {
              const flag = line.flag;
              setStatuses((s) => ({ ...s, [flag]: true }));
            }
          }, line.at)
        );
      });
      tids.push(window.setTimeout(() => setPhaseBoth("granted"), BOOT_END_MS + 420));
      tids.push(window.setTimeout(startExit, BOOT_END_MS + 1650));
      tids.push(window.setTimeout(() => setShowSkip(true), 1000));
    }
    timeouts.current = tids;
    return () => tids.forEach((t) => window.clearTimeout(t));
  }, [reduced, startExit, setPhaseBoth]);

  /* ---------- progress / telemetry loop ---------- */
  useEffect(() => {
    if (reduced) {
      if (pctEl.current) pctEl.current.textContent = "100";
      if (fillEl.current) fillEl.current.style.width = "100%";
      if (clockEl.current) clockEl.current.textContent = "T+00.00";
      if (memEl.current) memEl.current.textContent = "0x00000000";
      return;
    }
    let raf = 0;
    const loop = () => {
      const target = targetPct.current;
      dispPct.current += (target - dispPct.current) * 0.08;
      if (target - dispPct.current < 0.1) dispPct.current = target;
      const d = dispPct.current;
      if (pctEl.current) pctEl.current.textContent = String(Math.round(d)).padStart(3, "0");
      if (fillEl.current) fillEl.current.style.width = `${d}%`;

      const t = (performance.now() - t0.current) / 1000;
      if (clockEl.current) clockEl.current.textContent = `T+${t.toFixed(2).padStart(5, "0")}`;

      const now = performance.now();
      if (memEl.current && now - lastHexAt.current > 180) {
        lastHexAt.current = now;
        memEl.current.textContent = `0x${Math.floor(Math.random() * 0xffffffff)
          .toString(16)
          .toUpperCase()
          .padStart(8, "0")}`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  /* ---------- skip: any key / tap ---------- */
  useEffect(() => {
    if (reduced) return;
    const skip = (e: Event) => {
      if (
        e instanceof KeyboardEvent &&
        (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.key === "F5" || e.key === "F12" || e.key === "Tab")
      ) {
        return;
      }
      if (phaseRef.current !== "boot") return;
      timeouts.current.forEach((t) => window.clearTimeout(t));
      setLineCount(BOOT_LINES.length);
      setStatuses(STATUS_ONLINE);
      targetPct.current = 100;
      dispPct.current = 100;
      if (pctEl.current) pctEl.current.textContent = "100";
      if (fillEl.current) fillEl.current.style.width = "100%";
      setShowSkip(false);
      setPhaseBoth("granted");
      window.setTimeout(startExit, 550);
    };
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [reduced, startExit, setPhaseBoth]);

  const exiting = phase === "exit";
  const granted = phase === "granted" || exiting;
  const phaseLabel =
    lineCount >= BOOT_LINES.length
      ? "FINALIZING SEQUENCE"
      : lineCount >= 8
        ? "LOADING MODULES"
        : lineCount >= 4
          ? "CALIBRATING FIELD"
          : "INITIALIZING CORE";

  return (
    <div
      role="status"
      aria-label="HexaVora system boot sequence"
      className={`boot-root fixed inset-0 z-50 overflow-hidden font-mono text-ink ${
        reduced ? "bg-void" : ""
      } ${exiting ? "boot-exit" : ""} ${exiting && reduced ? "boot-root-exit" : ""}`}
    >
      {/* ---- shutter panels (slide away on exit) ---- */}
      {!reduced && (
        <>
          <div
            aria-hidden="true"
            className="boot-shutter boot-shutter-top absolute inset-x-0 top-0 z-0 h-[51%] bg-gradient-to-b from-abyss to-void"
          />
          <div
            aria-hidden="true"
            className="boot-shutter boot-shutter-bottom absolute inset-x-0 bottom-0 z-0 h-[51%] bg-gradient-to-b from-void to-abyss"
          />
        </>
      )}

      {/* light seam that splits the shutters */}
      {exiting && !reduced && (
        <div
          aria-hidden="true"
          className="boot-seam absolute inset-x-0 top-1/2 z-30 h-[2px] bg-hv-cyan shadow-[0_0_24px_rgba(62,231,255,0.9)]"
        />
      )}

      {/* ---- content + ambience (fades fast on exit) ---- */}
      <div className="boot-content absolute inset-0 z-10 flex flex-col">
        {/* ambience layers */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hv-glow" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hv-grid" />
        <ParticleField active={!reduced} />
        {!reduced && (
          <div
            aria-hidden="true"
            className="anim-scan pointer-events-none absolute inset-x-0 h-24"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(62,231,255,0.055), transparent)",
            }}
          />
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hv-vignette" />

        {/* top telemetry bar */}
        <header className="relative flex items-center justify-between px-5 py-4 sm:px-8 lg:px-14">
          <div className="flex items-center gap-3">
            <HexaLogo size={26} />
            <span className="text-[9px] tracking-[0.38em] text-dim">HEXAVORA SYSTEMS</span>
          </div>
          <div className="hidden items-center gap-5 text-[9px] tracking-[0.24em] text-dim sm:flex">
            {reduced && <span className="text-hv-amber/90">REDUCED MOTION · EXPRESS BOOT</span>}
            <span>UNIFIED BOOT v6.1.0</span>
            <span ref={clockEl} className="tabular-nums text-hv-cyan/80">
              T+00.00
            </span>
            <span ref={memEl} className="tabular-nums">
              0x00000000
            </span>
          </div>
        </header>

        {/* main deck */}
        <main className="hv-no-scrollbar relative mx-auto grid w-full max-w-6xl min-h-0 flex-1 items-start gap-8 overflow-y-auto px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-14 lg:overflow-visible lg:py-0 lg:px-14">
          {/* identity column */}
          <div className="flex flex-col items-start gap-7">
            <div className={reduced ? "" : "anim-flicker"}>
              <div className="flex items-center gap-5">
                <HexaLogo size={116} animated={!reduced} className="hidden sm:block sm:h-[116px] sm:w-[116px]" />
                <div>
                  <Wordmark className="text-2xl sm:text-3xl" />
                  <p className="mt-2 text-[9px] tracking-[0.34em] text-dim">
                    SYSTEM INITIALIZATION
                  </p>
                  <p className="mt-1 text-[9px] tracking-[0.2em] text-hv-teal/80">
                    NODE 07 · SECTOR 6 · CLEARANCE A
                  </p>
                </div>
              </div>
            </div>
            <div className="w-full">
              <StatusPanel statuses={statuses} reduced={reduced} />
            </div>
          </div>

          {/* log + progress column */}
          <div className="flex min-w-0 flex-col gap-5">
            <BootLog count={lineCount} />

            <div>
              <div className="mb-2 flex items-end justify-between gap-4">
                <div className="pb-1">
                  <div className="text-[9px] tracking-[0.34em] text-hv-cyan/90">{phaseLabel}</div>
                  <div className="mt-1.5 h-3 text-[9px] tracking-[0.24em] text-dim/70">
                    {showSkip && !exiting && (
                      <span className="anim-pulse-soft">PRESS ANY KEY · TAP TO SKIP</span>
                    )}
                  </div>
                </div>
                <div className="font-display text-4xl font-bold leading-none tracking-tight text-ink sm:text-5xl">
                  <span ref={pctEl} className="tabular-nums">
                    000
                  </span>
                  <span className="text-hv-cyan">%</span>
                </div>
              </div>

              <div className="relative h-2.5 w-full overflow-hidden border border-line bg-void">
                <div
                  ref={fillEl}
                  className="h-full bg-gradient-to-r from-hv-teal via-hv-cyan to-hv-cyan shadow-[0_0_14px_rgba(62,231,255,0.55)]"
                  style={{ width: "0%" }}
                />
                <div aria-hidden="true" className="hv-ticks absolute inset-0" />
                {!reduced && (
                  <span
                    aria-hidden="true"
                    className="anim-sheen absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                  />
                )}
              </div>

              <div className="mt-1.5 flex justify-between text-[8.5px] tracking-[0.26em] text-dim/70">
                <span>SEG 0x00 → 0xFF</span>
                <span className="tabular-nums">
                  TASK {String(Math.min(lineCount, BOOT_LINES.length)).padStart(2, "0")}/
                  {BOOT_LINES.length}
                </span>
              </div>
            </div>
          </div>
        </main>

        {/* ACCESS GRANTED stamp */}
        {granted && (
          <div className="stamp-in pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div className="-rotate-3 border-2 border-hv-ok/70 bg-void/80 px-7 py-3.5 shadow-[0_0_44px_rgba(87,232,141,0.28)]">
              <div className="font-display text-lg font-bold tracking-[0.34em] text-hv-ok sm:text-2xl">
                ACCESS GRANTED
              </div>
              <div className="mt-1 text-center text-[8.5px] tracking-[0.3em] text-hv-ok/70">
                ALL SYSTEMS NOMINAL
              </div>
            </div>
          </div>
        )}

        {/* bottom frame line */}
        <footer className="relative flex items-center justify-between px-5 py-3 text-[8.5px] tracking-[0.3em] text-dim/60 sm:px-8 lg:px-14">
          <span>HEXAVORA © 2087</span>
          <span className="hidden sm:inline">BOOT CHANNEL 06 · ENCRYPTED</span>
        </footer>
      </div>
    </div>
  );
}
