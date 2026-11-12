/**
 * Flowing light current for the contact form (run-10 RUN10-CONTACT —
 * replaces the run-9 ECG heartbeat trace): the form's living signature
 * moment is a wave of light that drifts across the form's head in real
 * time — a smooth sum of sines scrolling left, drawn with a soft glow
 * so it reads as light, not a monitor trace. Reduced motion: one static
 * settled wave, no loop (native hook — motion's useReducedMotion() is
 * unreliable in this app, run-9 iter 1).
 */
"use client";

import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Milliseconds per wave cycle (a calm 2s drift). */
export const LIGHTFLOW_CYCLE_MS = 2000;
/** Horizontal scroll speed of the wave, CSS px per second. */
export const LIGHTFLOW_PX_PER_SEC = 90;

/**
 * One light wave as a sum of sines over phase [0, 1): a slow swell,
 * a second harmonic for shape, and a faint third for shimmer. Bounded
 * by 1 in magnitude, smooth everywhere. Pure — unit-tested in
 * contact-light-flow.test.ts.
 */
export function lightFlowValue(phase: number): number {
  const p = ((phase % 1) + 1) % 1;
  const a = 2 * Math.PI * p;
  return (
    0.55 * Math.sin(a) + // the swell
    0.3 * Math.sin(2 * a) + // shape
    0.15 * Math.sin(3 * a) // shimmer
  );
}

/** An RGB color for the wave accent. */
export interface WaveAccentRgb {
  r: number;
  g: number;
  b: number;
}

/** Parse a computed accent color: `rgb(r, g, b)` or hex. Pure.
 * Custom properties are NOT registered with @property, so
 * getComputedStyle returns them verbatim as authored (`#ffaa50`),
 * not as computed rgb() — the hex branch is the one that actually
 * fires for `--portfolio-accent` (the rgb branch covers the fallback
 * path and any registered token). */
export function parseWaveAccent(value: string): WaveAccentRgb | null {
  const rgb =
    /^\s*rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)\s*$/.exec(
      value,
    );
  if (rgb) {
    const [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    if ([r, g, b].some((v) => v < 0 || v > 255)) return null;
    return { r, g, b };
  }
  const hex = /^\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\s*$/.exec(value);
  if (hex) {
    const h =
      hex[1].length === 3
        ? [...hex[1]].map((c) => c + c).join("")
        : hex[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  return null;
}

/** Linear mix of two wave accents. Pure. */
export function mixWaveAccent(
  a: WaveAccentRgb,
  b: WaveAccentRgb,
  k: number,
): WaveAccentRgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * k),
    g: Math.round(a.g + (b.g - a.g) * k),
    b: Math.round(a.b + (b.b - a.b) * k),
  };
}

/** Serialize a wave accent for canvas stroke/shadow color. Pure. */
export function waveAccentCss(c: WaveAccentRgb): string {
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

/**
 * Read the wave's accent off the canvas element itself: the active
 * chapter's preset recolors `--portfolio-accent` scoped to #contact
 * (globals.css, RUN10-PRESETS fix4), and the canvas sits inside
 * #contact, so this follows the chapter palette. Falls back to the
 * cyan default when the token is unreadable.
 */
export function readWaveAccent(canvas: HTMLCanvasElement): WaveAccentRgb {
  const raw = getComputedStyle(canvas)
    .getPropertyValue("--portfolio-accent")
    .trim();
  return (
    parseWaveAccent(raw) ?? { r: 125, g: 211, b: 252 } // #7dd3fc
  );
}

export function ContactLightFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // The accent is read off the CANVAS element itself, not the root:
    // the active chapter's preset recolors the accent token scoped to
    // #contact (see globals.css, RUN10-PRESETS fix4), so the wave —
    // the contact section's own light — follows the chapter palette.
    // A MutationObserver watches `data-light-preset` (set by
    // LightRibbons on chapter change) and the draw loop lerps the
    // color over the same ~600ms as the ribbon crossfade, so the wave
    // warms to gold as the canvas does instead of snapping. Reduced
    // motion: the switch is discrete (snap + one static redraw), the
    // same contract as the ribbon's static frame.
    let accentCur = readWaveAccent(canvas);
    let accentFrom = accentCur;
    let accentTarget = accentCur;
    let accentTweenStart = 0;

    let raf = 0;
    let width = 0;
    let height = 0;

    const draw = (nowMs: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (w !== width || h !== height) {
        width = w;
        height = h;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      // Accent crossfade (fix4): ease the wave's color toward the
      // chapter preset over ~600ms, matching the ribbon tween.
      const k = Math.min(1, Math.max(0, (nowMs - accentTweenStart) / 600));
      const eased = k * k * (3 - 2 * k);
      accentCur = mixWaveAccent(accentFrom, accentTarget, eased);
      const accent = waveAccentCss(accentCur);
      const midY = height / 2;
      const amp = height * 0.36;
      // The wave: for each x, the phase at that moment in the
      // scrolling window (now at the right edge, older to the left).
      const path = () => {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 2) {
          const t = nowMs - ((width - x) / LIGHTFLOW_PX_PER_SEC) * 1000;
          const y = midY - lightFlowValue(t / LIGHTFLOW_CYCLE_MS) * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      };
      // Soft under-glow first, then the bright core — the trace reads
      // as light spilling across the head, not a hairline on a sheet.
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 5;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12;
      path();
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8;
      path();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    };

    // The preset observer sits after draw() so the callback can call
    // it without a use-before-declare: on `data-light-preset` change
    // (LightRibbons, chapter change) re-read the token and start the
    // ~600ms color crossfade; under reduced motion snap + redraw once.
    const onPresetChange = () => {
      const next = readWaveAccent(canvas);
      accentFrom = accentCur;
      accentTarget = next;
      accentTweenStart = performance.now();
      if (reduceMotion) {
        accentCur = next;
        accentFrom = next;
        draw(performance.now());
      }
    };
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "data-light-preset") {
          onPresetChange();
          break;
        }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-light-preset"],
    });

    if (reduceMotion) {
      // Static settled wave: a fixed moment at a gentle slope
      // (phase 0.25 at now = 500ms).
      draw(LIGHTFLOW_CYCLE_MS * 0.25);
      return () => observer.disconnect();
    }
    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      data-contact-lightflow
      className="journey-contact-lightflow"
      aria-hidden="true"
    />
  );
}
