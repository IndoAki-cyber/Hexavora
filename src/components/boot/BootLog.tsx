import { useEffect, useRef } from "react";
import { BOOT_LINES, KIND_TAG } from "../../lib/boot";

interface BootLogProps {
  count: number;
}

function CornerTicks() {
  return (
    <>
      <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-hv-cyan/70" />
      <span className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-hv-cyan/70" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-hv-cyan/70" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-hv-cyan/70" />
    </>
  );
}

export default function BootLog({ count }: BootLogProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  return (
    <div className="relative border border-line bg-panel/70">
      <CornerTicks />

      {/* panel header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="text-[9px] tracking-[0.32em] text-dim">SYS.LOG // STREAM</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-hv-red/80" />
          <span className="h-1.5 w-1.5 rounded-full bg-hv-amber/80" />
          <span className="h-1.5 w-1.5 rounded-full bg-hv-ok/80" />
        </span>
      </div>

      {/* feed */}
      <div
        ref={boxRef}
        className="h-48 overflow-hidden px-4 py-3 sm:h-60 lg:h-64"
        aria-label="Boot log"
      >
        {BOOT_LINES.slice(0, count).map((line, i) => {
          const meta = KIND_TAG[line.kind];
          return (
            <div
              key={i}
              className="log-line flex items-baseline gap-3 text-[10.5px] leading-6 sm:text-[11.5px]"
            >
              <span className="shrink-0 tabular-nums text-dim/70">
                [{(line.at / 1000).toFixed(3).padStart(6, "0")}]
              </span>
              <span className="min-w-0 flex-1 text-ink/90">{line.text}</span>
              <span
                className={`shrink-0 border px-1 py-px text-[8.5px] tracking-[0.22em] ${meta.cls}`}
              >
                {meta.tag}
              </span>
            </div>
          );
        })}
        <div className="log-line inline-block text-hv-cyan">
          <span className="anim-blink">▍</span>
        </div>
      </div>
    </div>
  );
}
