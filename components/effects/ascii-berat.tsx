"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * BERAT as high-density canvas-sampled ASCII art (React-Bits-style).
 *
 * Instead of hand-designed letter masks, the word "BERAT" is rasterized to an
 * offscreen canvas at high resolution and sampled on a fine 180x36 grid —
 * roughly 2x the symbol density of the old 17-row masks (~4x total glyphs).
 * Each cell's brightness maps through a 67-glyph density ramp (light -> dark),
 * so anti-aliased edges become natural ASCII shading with much finer detail,
 * like https://reactbits.dev/text-animations/ascii-text (MIT).
 *
 * Artistic touches kept: every glyph is its own <span> with seeded jitter
 * (+/-1.5px, +/-2.5 deg rotation, 0.92-1.08x scale) plus row undulation, so it
 * feels hand-placed, not computer-perfect. A 2s shimmer tick re-rolls glyphs
 * and jitter at the same brightness — texture shifts, letterforms stay.
 *
 * Client-only: sampling needs a canvas, so the art builds on mount
 * (layout effect -> no paint flash) and SSR renders an empty shell.
 */

const COLS = 180;
const ROWS = 36;
const CELL_PX = 10;
const WORD = "BERAT";

/**
 * Density ramp, light -> dark (React Bits ASCIIText charset).
 * All printable ASCII (0x20-0x7E) — nothing that renders as a broken glyph.
 */
const RAMP =
  " .'`^\\\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const RAMP_LEN = RAMP.length;

const NBSP = "\u00a0";

/** Deterministic PRNG so shimmer ticks are stable (no hydration mismatch). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Rasterize WORD once and return per-cell brightness in [0,1].
 * Deterministic per browser/font — sampled once and cached in a ref.
 */
function sampleBrightness(): Float32Array {
  const out = new Float32Array(COLS * ROWS);
  const W = COLS * CELL_PX;
  const H = ROWS * CELL_PX;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return out;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Fit the word: measure at 400px, then scale to fill 94% of the width while
  // keeping the cap-height inside 92% of the height (Arial Black cap ~0.72em).
  let fs = 400;
  ctx.font = `900 ${fs}px "Arial Black", Arial, Helvetica, sans-serif`;
  const tw = ctx.measureText(WORD).width || 1;
  fs = Math.min(fs * ((W * 0.94) / tw), (H * 0.92) / 0.72);
  ctx.font = `900 ${fs}px "Arial Black", Arial, Helvetica, sans-serif`;
  ctx.fillText(WORD, W / 2, H / 2);
  const data = ctx.getImageData(0, 0, W, H).data;
  // 3x3 subsample per 10px cell.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let sum = 0;
      for (let sy = 0; sy < CELL_PX; sy += 4) {
        for (let sx = 0; sx < CELL_PX; sx += 4) {
          sum += data[((r * CELL_PX + sy) * W + (c * CELL_PX + sx)) * 4] ?? 0;
        }
      }
      out[r * COLS + c] = sum / 9 / 255;
    }
  }
  return out;
}

function buildRows(bright: Float32Array, tick: number): ReactNode[][] {
  const rng = mulberry32(1337 + tick * 7919);
  const rows: ReactNode[][] = [];
  for (let r = 0; r < ROWS; r++) {
    // Gentle row undulation — rows breathe instead of running laser-straight.
    const rowWave = Math.sin(r * 0.35) * 1.5;
    const segs: ReactNode[] = [];
    let spaces = 0;
    for (let c = 0; c < COLS; c++) {
      const b = bright[r * COLS + c] ?? 0;
      // Micro-noise: flat areas get subtle organic texture variation.
      const bn = Math.min(1, Math.max(0, b + (rng() - 0.5) * 0.05));
      if (bn < 0.12) {
        spaces++;
        continue;
      }
      if (spaces > 0) {
        segs.push(NBSP.repeat(spaces));
        spaces = 0;
      }
      const t = (bn - 0.12) / 0.88;
      const ch = RAMP[Math.min(RAMP_LEN - 1, Math.floor(t * RAMP_LEN))] ?? "@";
      segs.push(
        <span
          key={c}
          className="ascii-berat-cell"
          aria-hidden="true"
          style={{
            transform: `translate(${((rng() - 0.5) * 3).toFixed(2)}px, ${((rng() - 0.5) * 3 + rowWave).toFixed(2)}px) rotate(${((rng() - 0.5) * 5).toFixed(2)}deg) scale(${(0.92 + rng() * 0.16).toFixed(3)})`,
          }}
        >
          {ch}
        </span>,
      );
    }
    if (spaces > 0) segs.push(NBSP.repeat(spaces));
    rows.push(segs);
  }
  return rows;
}

export function AsciiBerat() {
  const brightRef = useRef<Float32Array | null>(null);
  const [ready, setReady] = useState(false);
  // tick starts at 0; the shimmer interval re-rolls glyphs/jitter per tick.
  const [tick, setTick] = useState(0);

  useIsomorphicLayoutEffect(() => {
    brightRef.current = sampleBrightness();
    setReady(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 2000);
    return () => window.clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    if (!ready || !brightRef.current) return null;
    return buildRows(brightRef.current, tick);
  }, [ready, tick]);

  return (
    <div data-ascii-berat aria-hidden="true" className="ascii-berat">
      {rows === null
        ? null
        : rows.map((segs, r) => (
            <div key={r} className="ascii-berat-row" aria-hidden="true">
              {segs}
            </div>
          ))}
    </div>
  );
}
