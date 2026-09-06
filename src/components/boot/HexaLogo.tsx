import { useEffect, useState } from "react";

interface HexaLogoProps {
  size?: number;
  /** when true, strokes draw themselves in sequence */
  animated?: boolean;
  className?: string;
}

export default function HexaLogo({ size = 120, animated = false, className = "" }: HexaLogoProps) {
  const draw = (delay: number) =>
    animated
      ? { pathLength: 1, className: "anim-draw", style: { animationDelay: `${delay}ms` } }
      : {};

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ filter: "drop-shadow(0 0 10px rgba(62,231,255,0.28))" }}
    >
      {/* rotating dashed orbit */}
      <circle
        cx="60"
        cy="60"
        r="57"
        stroke="#16283f"
        strokeWidth="1"
        strokeDasharray="3 7"
        className="anim-rot"
        opacity="0.9"
      />

      {/* outer hex shell */}
      <path
        d="M60 7 L106 33.5 V86.5 L60 113 L14 86.5 V33.5 Z"
        stroke="#3ee7ff"
        strokeWidth="2.4"
        strokeLinejoin="miter"
        {...draw(0)}
      />

      {/* inner hex lattice */}
      <path
        d="M91 60 L75.5 87 H44.5 L29 60 L44.5 33 H75.5 Z"
        stroke="#2dd6a9"
        strokeWidth="1.3"
        opacity="0.75"
        {...draw(260)}
      />

      {/* voracious V-core */}
      <path
        d="M43 44 L60 77 L77 44"
        stroke="#ffb547"
        strokeWidth="4.6"
        strokeLinecap="square"
        {...draw(520)}
      />
      <path d="M60 77 V90" stroke="#ffb547" strokeWidth="2" opacity="0.8" {...draw(760)} />

      {/* vertex nodes */}
      {[
        [60, 7],
        [106, 33.5],
        [106, 86.5],
        [60, 113],
        [14, 86.5],
        [14, 33.5],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.1" fill="#3ee7ff" opacity={animated ? undefined : 0.9} {...draw(820)} />
      ))}
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-[0.32em] text-ink ${className}`}>
      HEXA<span className="text-hv-cyan">VORA</span>
    </span>
  );
}

/** Brand image path — drop the final logo file here and it renders automatically. */
export const BRAND_IMG = "/assets/hexavora-logo.png";

/**
 * Fixed-size brand image slot for the boot identity block.
 * Renders the brand image when present; otherwise a quiet monogram holds the
 * layout so nothing beside it ever shifts.
 */
export function BrandSlot({ className = "" }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let live = true;
    const probe = new Image();
    probe.onload = () => live && setChecked(true);
    probe.onerror = () => live && setFailed(true);
    probe.src = BRAND_IMG;
    return () => {
      live = false;
    };
  }, []);

  const showImage = checked && !failed;

  return (
    <div
      className={`brand-slot shrink-0 ${className}`}
      aria-label="HexaVora brand"
      data-brand-slot
      data-has-image={showImage ? "true" : "false"}
    >
      {showImage ? (
        <img
          src={BRAND_IMG}
          alt="HexaVora"
          className="h-full w-full object-contain p-[10%]"
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : (
        <svg viewBox="0 0 120 120" className="h-[72%] w-[72%]" fill="none" aria-hidden="true">
          <path
            d="M60 10 L103.3 35 V85 L60 110 L16.7 85 V35 Z"
            stroke="#3ee7ff"
            strokeOpacity="0.4"
            strokeWidth="2"
          />
          <path
            d="M42 38 V82 M78 38 V82 M42 60 H78"
            stroke="#dfe9f5"
            strokeOpacity="0.85"
            strokeWidth="7"
            strokeLinecap="square"
          />
        </svg>
      )}
      {/* corner ticks */}
      <span className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l border-t border-hv-cyan/70" />
      <span className="pointer-events-none absolute right-0 top-0 h-2 w-2 border-r border-t border-hv-cyan/70" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-2 w-2 border-b border-l border-hv-cyan/70" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 border-b border-r border-hv-cyan/70" />
    </div>
  );
}
