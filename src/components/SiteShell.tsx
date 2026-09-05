import { useEffect, useRef, useState } from "react";
import HexaLogo, { Wordmark } from "./boot/HexaLogo";

interface SiteShellProps {
  revealed: boolean;
}

const MODULES = [
  { code: "HEX-01", name: "3D CORE", desc: "Volumetric interface engine" },
  { code: "HEX-02", name: "ABOUT SEQUENCE", desc: "Origin & directive briefing" },
  { code: "HEX-03", name: "PAYMENT GATEWAY", desc: "Transaction layer" },
  { code: "HEX-04", name: "HEXAS NETWORK", desc: "Distributed mesh protocol" },
];

export default function SiteShell({ revealed }: SiteShellProps) {
  const [uptime, setUptime] = useState(0);
  const [session] = useState(() =>
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .toUpperCase()
      .padStart(6, "0")
  );
  const bootAt = useRef(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setUptime(Math.floor((Date.now() - bootAt.current) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const mm = String(Math.floor(uptime / 60)).padStart(2, "0");
  const ss = String(uptime % 60).padStart(2, "0");

  return (
    <div
      className={`site-shell ${revealed ? "is-revealed" : ""} relative min-h-screen overflow-hidden bg-void font-mono text-ink`}
    >
      {/* ambience */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hv-glow" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hv-grid" />
      <HexaLogo
        size={440}
        className="anim-rot pointer-events-none absolute -right-40 top-1/2 -translate-y-1/2 opacity-[0.05]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hv-vignette" />

      {/* header */}
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <HexaLogo size={30} />
          <Wordmark className="text-sm" />
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 border border-hv-ok/40 bg-hv-ok/5 px-2.5 py-1 text-[9px] tracking-[0.3em] text-hv-ok">
            <span className="anim-pulse-soft h-1.5 w-1.5 rounded-full bg-hv-ok shadow-[0_0_8px_rgba(87,232,141,0.9)]" />
            ONLINE
          </span>
          <span className="hidden text-[9px] tabular-nums tracking-[0.24em] text-dim sm:inline">
            T+{mm}:{ss}
          </span>
        </div>
      </header>

      {/* main */}
      <main className="relative mx-auto w-full max-w-6xl px-5 pb-24 pt-12 sm:px-8 lg:pt-20">
        <p className="text-[9px] tracking-[0.4em] text-hv-cyan">BOOT COMPLETE // INTERFACE ONLINE</p>
        <h1 className="mt-5 font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
          HEXA<span className="text-hv-cyan">VORA</span>
        </h1>
        <p className="mt-6 max-w-md text-xs leading-relaxed text-dim sm:text-sm">
          Primary systems initialized and holding steady. Core modules are staged in the
          manifest below and will come online in subsequent deployment phases.
        </p>

        {/* module manifest */}
        <div className="mt-12">
          <div className="mb-3 flex items-center justify-between text-[9px] tracking-[0.32em] text-dim">
            <span>MODULE MANIFEST</span>
            <span>04 STAGED · 00 ACTIVE</span>
          </div>
          <ul className="space-y-2">
            {MODULES.map((m) => (
              <li
                key={m.code}
                className="group flex cursor-default items-center gap-4 border border-line bg-panel/40 px-4 py-4 transition-all duration-300 hover:translate-x-1.5 hover:border-hv-cyan/50 hover:bg-panel/80 sm:gap-6 sm:px-6"
              >
                <span className="w-16 shrink-0 text-[9px] tabular-nums tracking-[0.2em] text-dim/80">
                  {m.code}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-sm font-semibold tracking-[0.12em] text-ink sm:text-base">
                    {m.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[9.5px] tracking-[0.08em] text-dim">
                    {m.desc}
                  </span>
                </span>
                <span className="anim-pulse-soft shrink-0 border border-hv-amber/50 px-2 py-0.5 text-[8.5px] tracking-[0.26em] text-hv-amber">
                  STANDBY
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0 text-dim transition-all duration-300 group-hover:translate-x-1 group-hover:text-hv-cyan"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" strokeLinecap="square" />
                </svg>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* footer */}
      <footer className="absolute inset-x-0 bottom-0 border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 text-[8.5px] tracking-[0.28em] text-dim/70 sm:px-8">
          <span>HEXAVORA SYSTEMS · BUILD 6.1.0</span>
          <span className="tabular-nums">
            SESSION {session} · UPTIME {mm}:{ss}
          </span>
        </div>
      </footer>
    </div>
  );
}
