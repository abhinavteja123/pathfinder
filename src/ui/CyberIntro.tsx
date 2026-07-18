'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Cinematic Matrix-rain "cyber" intro overlay for first-time students.
 * Doubles as a loading screen while the demo page's seed/status fetches run.
 * ~7s timeline: rain builds -> terminal lines scramble-decode -> rain lerps
 * green -> app violet/cyan -> overlay fades and fires onDone exactly once.
 */
type Props = {
  year: number;
  program: string;
  onDone: () => void;
  /** Flip to true (e.g. status resolved to a returning student) to fade out immediately. */
  skip?: boolean;
};

const FONT = 16; // px glyph size == column width
const GLYPHS =
  Array.from({ length: 0xff9d - 0xff66 + 1 }, (_, i) => String.fromCharCode(0xff66 + i)).join('') +
  '0123456789';
const SCRAMBLE = '!<>-_\\/[]{}=+*^?#01';
const randOf = (s: string) => s[Math.floor(Math.random() * s.length)];

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const ca = channels(a);
  const cb = channels(b);
  const m = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
};

export default function CyberIntro({ year, program, onDone, skip }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  const [fading, setFading] = useState(false);
  const [shown, setShown] = useState<string[]>(['', '', '']);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const finish = useCallback(() => setFading(true), []);

  // Fire onDone exactly once, after the CSS opacity fade completes.
  useEffect(() => {
    if (!fading) return;
    const t = window.setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDoneRef.current();
      }
    }, 750);
    return () => window.clearTimeout(t);
  }, [fading]);

  useEffect(() => {
    if (skip) finish();
  }, [skip, finish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lines = [
      '> INITIALIZING PATHFINDER…',
      `> STUDENT PROFILE DETECTED — Y${year} · ${program}`,
      '> WAKE UP. YOUR COMPANION IS ONLINE.',
    ];

    let cols = 0;
    let drops: number[] = [];
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / FONT);
      drops = Array.from({ length: cols }, () => Math.random() * -(h / FONT));
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${FONT}px monospace`;
    };
    resize();
    window.addEventListener('resize', resize);

    // elapsed drives the column opacity ramp (0-1.5s) and the
    // green -> violet/cyan palette lerp (5-6.5s). Trail comes from the
    // translucent black fill each frame.
    const drawFrame = (elapsed: number) => {
      const alpha = Math.min(1, elapsed / 1500);
      const t = Math.min(1, Math.max(0, (elapsed - 5000) / 1500));
      const head = mix('#c8ffdc', '#38e1ff', t);
      const tail = mix('#00ff41', '#7c5cff', t);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = alpha;
      for (let i = 0; i < cols; i++) {
        const y = drops[i] * FONT;
        if (y > 0) {
          ctx.fillStyle = tail;
          ctx.fillText(randOf(GLYPHS), i * FONT, y - FONT);
          ctx.fillStyle = head;
          ctx.fillText(randOf(GLYPHS), i * FONT, y);
        }
        drops[i] += 1;
        if (y > h && Math.random() > 0.975) drops[i] = Math.random() * -20;
      }
      ctx.globalAlpha = 1;
    };

    const timers: number[] = [];

    if (reduced) {
      // ponytail: no animation loop under prefers-reduced-motion — pre-roll
      // frames synchronously for one static rain image, show text, quick fade.
      for (let f = 0; f < 120; f++) drawFrame(1500 + f * 33);
      setShown(lines);
      timers.push(window.setTimeout(finish, 1500));
      return () => {
        window.removeEventListener('resize', resize);
        timers.forEach((id) => window.clearTimeout(id));
      };
    }

    let raf = 0;
    let last = 0;
    const start = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return; // throttle to ~30fps
      last = now;
      drawFrame(now - start);
    };
    raf = requestAnimationFrame(loop);

    // Scramble-decode a terminal line: settle one char every 40ms, the rest
    // churn as random glyphs.
    const decode = (idx: number) => {
      const target = lines[idx];
      let settled = 0;
      const iv = window.setInterval(() => {
        settled++;
        const rest = target.length - settled;
        const txt =
          target.slice(0, settled) + Array.from({ length: Math.max(0, rest) }, () => randOf(SCRAMBLE)).join('');
        setShown((prev) => prev.map((s, i) => (i === idx ? txt : s)));
        if (settled >= target.length) window.clearInterval(iv);
      }, 40);
      timers.push(iv);
    };

    timers.push(window.setTimeout(() => decode(0), 1500));
    timers.push(window.setTimeout(() => decode(1), 2700));
    timers.push(window.setTimeout(() => decode(2), 4400));
    timers.push(window.setTimeout(finish, 6300)); // fade 6.3-7s, onDone ~7s

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      // clearInterval clears setTimeout ids too (shared browser timer pool)
      timers.forEach((id) => window.clearInterval(id));
    };
  }, [year, program, finish]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black transition-opacity duration-700 ease-out"
      style={{ opacity: fading ? 0 : 1 }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Terminal lines */}
      <div className="absolute inset-0 z-10 grid place-items-center px-6">
        <div className="w-full max-w-2xl font-mono text-sm leading-7 text-[#aaffc3] [text-shadow:0_0_8px_rgba(0,255,65,0.55)] md:text-base">
          {shown.map((s, i) => (
            <p key={i} className="min-h-7 whitespace-pre-wrap break-words">
              {s}
            </p>
          ))}
        </div>
      </div>

      {/* CRT scanlines */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 1px, transparent 1px, transparent 3px)',
        }}
      />
      {/* Radial vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.7) 100%)' }}
      />

      <button
        type="button"
        onClick={finish}
        className="absolute bottom-5 right-5 z-30 rounded border border-[rgba(0,255,65,0.35)] bg-black/60 px-3 py-1.5 font-mono text-xs text-[#7dff9e] transition-colors hover:border-[rgba(0,255,65,0.7)] hover:text-[#c8ffdc]"
      >
        Skip ⏭
      </button>
    </div>
  );
}
