"use client";

import { useEffect, useRef } from "react";

import {
  ASCII_GLOW_CHARS,
  ASCII_GLOW_SCRAMBLE_MS,
  asciiGlowAlpha,
  asciiGlowCellPresent,
  asciiGlowCellSize,
  asciiGlowField,
  asciiGlowGlyphIndex,
  asciiGlowHash,
  asciiGlowLightColor,
  asciiGlowScrambleCells,
  asciiGlowScrambleGlyphIndex,
  asciiGlowScrambleLive,
  asciiGlowSectionSeed,
} from "@/lib/section-ascii-glow";
import { useHydratedReducedMotion } from "@/lib/use-hydrated-reduced-motion";

// Section-heading ASCII glow (RUN10-ASCII-GLOW, reel 7 + React Bits
// Gradient ASCII) — a faint gradient-ASCII glow layer behind each
// section heading, rebuilt in the site's own Canvas2D stack from the
// GradientASCII source (MIT + Commons Clause, read in full 2026-11-12;
// no WebGL2, no new dependency). The canvas hangs behind the heading
// text (CSS: .section-ascii-glow, z-index 0 vs the WarpText span's 1)
// and paints a soft horizontal FROST ramp in ASCII glyphs — deep cyan
// at the left, near-white at the bright zone, fading right — at peak
// alpha 0.20, so the heading stays legible by construction.
//
// A pointer pass over the heading scrambles the glyphs near the
// pointer (they re-pick at 20fps for 0.7s, then settle back to the
// field-determined glyph — the reference's trail-scramble, rebuilt
// with the lib's deterministic model). The gradient peak sways on a
// 9s cycle so the bright zone drifts visibly. Reduced motion draws
// one static frame and never loops; the loop pauses while the heading
// is off-screen or the tab is hidden (hero-metaballs pattern).
// Colors follow the chapter: the glyphs read --portfolio-accent from
// computed style (per-chapter preset, like the contact wave) and the
// white-hot core only applies on dark backgrounds (body luminance).

const MONO_STACK =
  '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const FALLBACK_ACCENT = { r: 125, g: 211, b: 252 }; // #7dd3fc
const WHITE = { r: 232, g: 251, b: 255 };

type Rgb = { r: number; g: number; b: number };

function parseColor(value: string): Rgb | null {
  const rgb = value.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/,
  );
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
    };
  }
  const hex = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    return {
      r: Number.parseInt(hex[1].slice(0, 2), 16),
      g: Number.parseInt(hex[1].slice(2, 4), 16),
      b: Number.parseInt(hex[1].slice(4, 6), 16),
    };
  }
  return null;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function rgba(color: Rgb, alpha: number): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

export function SectionAsciiGlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useHydratedReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    const anchor = canvas.parentElement;
    if (!anchor) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    // Per-section seed from the heading id, so the six headings do not
    // all paint the same field (lib `variation`).
    const seed = asciiGlowSectionSeed(anchor.id || "section");
    let raf = 0;
    let disposed = false;
    let inView = true;
    let lastDrawMs = 0;
    // "cx,cy" -> expiry ms; pruned on every draw.
    const scramble = new Map<string, number>();

    const readColors = (): { accent: Rgb; dark: boolean } => {
      const raw = window
        .getComputedStyle(canvas)
        .getPropertyValue("--portfolio-accent");
      const accent = parseColor(raw) ?? FALLBACK_ACCENT;
      const bg = window.getComputedStyle(document.body).backgroundColor;
      const bgRgb = parseColor(bg) ?? { r: 5, g: 7, b: 12 };
      const luminance =
        (0.2126 * bgRgb.r + 0.7152 * bgRgb.g + 0.0722 * bgRgb.b) / 255;
      return { accent, dark: luminance < 0.5 };
    };

    const draw = (nowMs: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      if (
        canvas.width !== Math.round(w * dpr) ||
        canvas.height !== Math.round(h * dpr)
      ) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const { accent, dark } = readColors();
      const tSec = reducedMotion ? 0 : nowMs / 1000;
      const cellPx = asciiGlowCellSize(w);
      const cols = Math.ceil(w / cellPx);
      const rows = Math.ceil(h / cellPx);
      ctx.font = `600 ${cellPx}px ${MONO_STACK}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";

      let activeScramble = 0;
      for (const [key, expiry] of scramble) {
        if (!asciiGlowScrambleLive(expiry, nowMs)) scramble.delete(key);
      }
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const u = ((cx + 0.5) * cellPx) / w;
          const v = ((cy + 0.5) * cellPx) / h;
          const value = asciiGlowField(u, v, tSec, seed);
          if (!asciiGlowCellPresent(value, asciiGlowHash(cx, cy, 11 + seed))) {
            continue;
          }
          const key = `${cx},${cy}`;
          const expiry = scramble.get(key);
          const scrambling =
            expiry !== undefined && asciiGlowScrambleLive(expiry, nowMs);
          if (scrambling) activeScramble += 1;
          const index = scrambling
            ? asciiGlowScrambleGlyphIndex(cx, cy, nowMs)
            : asciiGlowGlyphIndex(value, asciiGlowHash(cx, cy, 7 + seed));
          const glyph = ASCII_GLOW_CHARS[index];
          if (glyph === " ") continue;
          const alpha = Math.min(
            0.5,
            asciiGlowAlpha(value, !dark) * (scrambling ? 1.6 : 1),
          );
          // Bright cells run toward white on dark backgrounds (the
          // white-hot core); on light backgrounds the accent is
          // deepened hue-preserving so the wash reads on white.
          const color = dark
            ? mix(accent, WHITE, value)
            : asciiGlowLightColor(accent);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = rgba(color, 1);
          ctx.fillText(glyph, (cx + 0.5) * cellPx, (cy + 0.5) * cellPx);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      canvas.dataset.asciiGlow = "ready";
      canvas.dataset.asciiGlowScramble = String(activeScramble);
      lastDrawMs = nowMs;
    };

    const wake = () => {
      if (!raf && !disposed && inView && !document.hidden) {
        raf = requestAnimationFrame(frame);
      }
    };

    const frame = (nowMs: number) => {
      raf = 0;
      if (disposed || !inView || document.hidden) return;
      // The drift is slow: redraw at most every 90ms at rest; while a
      // scramble is live, draw every frame so the 50ms re-pick reads.
      const scrambling = scramble.size > 0;
      if (scrambling || nowMs - lastDrawMs >= 90) draw(nowMs);
      if (!reducedMotion) raf = requestAnimationFrame(frame);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reducedMotion) return;
      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      if (px < 0 || py < 0 || px > rect.width || py > rect.height) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      const cellPx = asciiGlowCellSize(w);
      const cols = Math.ceil(w / cellPx);
      const rows = Math.ceil(h / cellPx);
      const nowMs = performance.now();
      for (const key of asciiGlowScrambleCells(px, py, cols, rows, cellPx)) {
        scramble.set(key, nowMs + ASCII_GLOW_SCRAMBLE_MS);
      }
      wake();
    };

    const resize = () => {
      draw(reducedMotion ? 0 : performance.now());
      wake();
    };

    const intersection = new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      if (inView) {
        resize();
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    intersection.observe(anchor);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(anchor);
    anchor.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", wake);

    // Reduced motion: one static frame, no loop, no scramble.
    draw(0);
    if (!reducedMotion) wake();

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      intersection.disconnect();
      resizeObserver.disconnect();
      anchor.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", wake);
    };
    // Re-mount when the motion preference flips (the RM branch draws
    // one static frame; the motion branch loops). Intentionally not
    // re-running on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      data-section-ascii-glow
      aria-hidden="true"
      className="section-ascii-glow"
    />
  );
}
