import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
  c: string;
  tw: number;
}

interface Streak {
  x: number;
  y: number;
  vx: number;
  len: number;
}

const COLORS = ["62,231,255", "255,181,71", "45,214,169", "223,233,245"];

interface ParticleFieldProps {
  /** false → renders a single static frame (reduced motion) */
  active: boolean;
}

export default function ParticleField({ active }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let nextStreak = 1400;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let parts: Particle[] = [];
    const streaks: Streak[] = [];

    const spawn = (anywhere: boolean): Particle => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -(Math.random() * 0.35 + 0.08),
      a: Math.random() * 0.5 + 0.14,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      tw: Math.random() * Math.PI * 2,
    });

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(110, Math.floor((w * h) / 16000));
      parts = Array.from({ length: n }, () => spawn(true));
    };

    let last = performance.now();
    const draw = (now: number) => {
      const dt = now - last;
      last = now;
      ctx.clearRect(0, 0, w, h);

      for (const p of parts) {
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.tw += 0.02 * (dt / 16);
        if (p.y < -8 || p.x < -8 || p.x > w + 8) Object.assign(p, spawn(false));
        const alpha = p.a * (0.6 + 0.4 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.c},${alpha.toFixed(3)})`;
        ctx.fill();
      }

      if (active) {
        nextStreak -= dt;
        if (nextStreak <= 0) {
          nextStreak = 1800 + Math.random() * 2600;
          streaks.push({ x: -80, y: Math.random() * h * 0.85, vx: 5 + Math.random() * 6, len: 60 + Math.random() * 90 });
        }
        for (let i = streaks.length - 1; i >= 0; i--) {
          const s = streaks[i];
          s.x += s.vx * (dt / 16);
          const grad = ctx.createLinearGradient(s.x - s.len, s.y, s.x, s.y);
          grad.addColorStop(0, "rgba(62,231,255,0)");
          grad.addColorStop(1, "rgba(62,231,255,0.35)");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(s.x - s.len, s.y);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
          if (s.x - s.len > w) streaks.splice(i, 1);
        }
      }

      if (active) raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    if (active) {
      raf = requestAnimationFrame(draw);
    } else {
      draw(performance.now());
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
    />
  );
}
