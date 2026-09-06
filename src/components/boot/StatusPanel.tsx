import { useEffect, useState } from "react";
import { STATUS_META, STATUS_ORDER, type StatusKey } from "../../lib/boot";

interface StatusPanelProps {
  statuses: Record<StatusKey, boolean>;
  reduced: boolean;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function StatusPanel({ statuses, reduced }: StatusPanelProps) {
  const [meters, setMeters] = useState({ temp: 41.2, load: 34, flux: 76 });

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setMeters((m) => ({
        temp: clamp(m.temp + (Math.random() - 0.48) * 1.5, 38, 52),
        load: clamp(m.load + (Math.random() - 0.5) * 9, 16, 66),
        flux: clamp(m.flux + (Math.random() - 0.5) * 7, 58, 98),
      }));
    }, 700);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <div className="border border-line bg-panel/50">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-[9px] tracking-[0.32em] text-dim">SUBSYSTEMS</span>
        <span className="text-[9px] tracking-[0.2em] text-hv-cyan/80">
          {STATUS_ORDER.filter((k) => statuses[k]).length}/{STATUS_ORDER.length} ONLINE
        </span>
      </div>

      {/* indicators */}
      <div className="grid grid-cols-2 gap-px bg-line/60 sm:grid-cols-3">
        {STATUS_ORDER.map((key) => {
          const online = statuses[key];
          return (
            <div key={key} className="bg-panel/90 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[8.5px] tracking-[0.18em] text-dim">
                  {STATUS_META[key].label}
                </span>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    online ? "bg-hv-ok shadow-[0_0_6px_rgba(87,232,141,0.9)]" : "anim-pulse-soft bg-dim/60"
                  }`}
                />
              </div>
              <div
                className={`mt-0.5 font-display text-[11px] font-semibold tracking-[0.14em] ${
                  online ? "text-hv-ok" : "text-dim/70"
                }`}
              >
                {online ? STATUS_META[key].okText : "PENDING"}
              </div>
            </div>
          );
        })}
      </div>

      {/* live meters */}
      <div className="space-y-2 border-t border-line px-3 py-3">
        <Meter label="CORE TEMP" value={`${meters.temp.toFixed(1)}°C`} pct={(meters.temp / 60) * 100} color="bg-hv-amber" />
        <Meter label="CORE LOAD" value={`${Math.round(meters.load)}%`} pct={meters.load} color="bg-hv-cyan" />
        <Meter label="FLUX" value={`${Math.round(meters.flux)}%`} pct={meters.flux} color="bg-hv-teal" />
      </div>
    </div>
  );
}

function Meter({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[8.5px] tracking-[0.24em] text-dim">{label}</span>
        <span className="text-[9.5px] tabular-nums text-ink/85">{value}</span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden bg-line/70">
        <div
          className={`h-full ${color} transition-[width] duration-500 ease-out`}
          style={{ width: `${clamp(pct, 2, 100)}%` }}
        />
      </div>
    </div>
  );
}
