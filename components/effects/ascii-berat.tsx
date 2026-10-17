"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * BERAT as fluid, hand-made ASCII art.
 *
 * The letterforms below are density masks. At render time each filled cell
 * is mapped through a seeded noise function to a classic ASCII density ramp
 * (printable ASCII only — $@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\|()1{}[]?-_+~<>i!lI;:,"^`'.).
 *
 * To break the rigid computer-perfect grid, every glyph is rendered as its
 * own <span> with seeded imperfections:
 *   - positional jitter (±1.5px x/y) — characters don't sit in perfect rows
 *   - slight rotation (±2.5°) — hand-placed feel
 *   - size variation (0.92–1.08×) — uneven ink
 *   - torn edges — exposed edge cells randomly drop out, and stray light
 *     glyphs sprout just outside the edges, so outlines are jagged not clean
 *   - gentle row undulation — rows breathe instead of running laser-straight
 *   - per-letter vertical drift — letters don't share a perfect baseline
 *
 * All randomness is seeded (mulberry32) per tick, so SSR and the first client
 * render match exactly — no hydration mismatch. The 2s shimmer tick re-rolls
 * glyphs and jitter, so the wordmark feels alive but the letterforms never
 * move enough to lose readability: it always reads B-E-R-A-T.
 */

/* Density masks — 17 rows each. Proven readable letterforms. */
const LETTER_B: readonly string[] = [
  "████████████████",
  "████████████████",
  "█████      █████",
  "█████      █████",
  "█████      █████",
  "█████      █████",
  "█████      █████",
  "████████████████",
  "████████████████",
  "█████      █████",
  "█████      █████",
  "█████      █████",
  "█████      █████",
  "█████      █████",
  "█████      █████",
  "████████████████",
  "████████████████",
];

const LETTER_E: readonly string[] = [
  "████████████████",
  "████████████████",
  "█████",
  "█████",
  "█████",
  "█████",
  "█████",
  "█████████████",
  "█████████████",
  "█████",
  "█████",
  "█████",
  "█████",
  "█████",
  "█████",
  "████████████████",
  "████████████████",
];

const LETTER_R: readonly string[] = [
  "████████████████",
  "████████████████",
  "█████      █████",
  "█████      █████",
  "█████      █████",
  "█████      █████",
  "█████      █████",
  "███████████████",
  "█████████████",
  "█████   █████",
  "█████    █████",
  "█████     █████",
  "█████      █████",
  "█████       █████",
  "█████        █████",
  "█████         █████",
  "█████          █████",
];

const LETTER_A: readonly string[] = [
  "       ███",
  "      █████",
  "     ███████",
  "    █████████",
  "   ███████████",
  "   █████ █████",
  "  █████   █████",
  "  █████   █████",
  " ███████████████",
  " ███████████████",
  "█████     █████",
  "█████     █████",
  "█████     █████",
  "█████     █████",
  "█████     █████",
  "█████     █████",
  "█████     █████",
];

const LETTER_T: readonly string[] = [
  "█████████████████",
  "█████████████████",
  "      █████",
  "      █████",
  "      █████",
  "      █████",
  "      █████",
  "      █████",
  "      █████",
  "      █████",
  "      █████",
  "      █████",
  "      █████",
  "      █████",
  "      █████",
  "      █████",
  "      █████",
];

const LETTERS: Readonly<Record<string, readonly string[]>> = {
  B: LETTER_B,
  E: LETTER_E,
  R: LETTER_R,
  A: LETTER_A,
  T: LETTER_T,
};

const WORD = "BERAT";
const GAP_CELLS = 4; // 4-space gap between letters for clear separation

/** Deterministic PRNG so the art is stable per tick (no hydration mismatch). */
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

/**
 * Classic ASCII density ramp, grouped by visual weight (darkest ink first).
 * All printable ASCII (0x20–0x7E) — nothing that can render as a broken glyph.
 *
 * Bucket 3 = solid core:   the heaviest ink  ($@B%8&WM#)
 * Bucket 2 = near-core:    heavy-medium      (*oahkbdpqwmZO0Q)
 * Bucket 1 = mid/edge:     medium-light      (LCJUYXzcvunxrjft)
 * Bucket 0 = faint edge:   lightest          (/\|()1{}[]?-_+~<>i!lI;:,"^`'.)
 */
const DENSITY: ReadonlyArray<readonly string[]> = [
  ["/", "\\", "|", "(", ")", "1", "{", "}", "[", "]", "?", "-", "_", "+", "~", "<", ">", "i", "!", "l", "I", ";", ":", ",", '"', "^", "`", "'", "."],
  ["L", "C", "J", "U", "Y", "X", "z", "c", "v", "u", "n", "x", "r", "j", "f", "t"],
  ["*", "o", "a", "h", "k", "b", "d", "p", "q", "w", "m", "Z", "O", "0", "Q"],
  ["$", "@", "B", "%", "8", "&", "W", "M", "#"],
];

/** Sparse static around the letters — pure ASCII so it never looks broken. */
const HALO: readonly string[] = [".", "'", "`", ",", " "];

const NBSP = " ";

interface BeratCell {
  /** The character to render (NBSP for empty cells). */
  ch: string;
  /** Horizontal jitter in px. */
  dx: number;
  /** Vertical jitter in px. */
  dy: number;
  /** Rotation in degrees. */
  rot: number;
  /** Scale factor. */
  scale: number;
}

function neighborCount(mask: readonly string[], r: number, c: number, height: number, w: number): number {
  let n = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < height && cc >= 0 && cc < w && mask[rr]?.[cc] !== " ") n++;
    }
  }
  return n;
}

function isNearLetter(mask: readonly string[], r: number, c: number, height: number, w: number): boolean {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < height && cc >= 0 && cc < w && mask[rr]?.[cc] !== " ") return true;
    }
  }
  return false;
}

function jitterCell(rng: () => number, ch: string, rowWave: number): BeratCell {
  return {
    ch,
    dx: (rng() - 0.5) * 3, // ±1.5px
    dy: (rng() - 0.5) * 3 + rowWave, // ±1.5px + row undulation
    rot: (rng() - 0.5) * 5, // ±2.5°
    scale: 0.92 + rng() * 0.16, // 0.92–1.08
  };
}

function buildCells(tick: number): BeratCell[][] {
  const rng = mulberry32(1337 + tick * 7919);
  const masks = WORD.split("").map((ch) => {
    const rows = LETTERS[ch] ?? [];
    const w = Math.max(...rows.map((r) => r.length));
    return rows.map((r) => r.padEnd(w, " "));
  });
  const height = masks[0]?.length ?? 0;

  // Per-letter vertical drift — letters don't share a perfect baseline.
  const letterDy = masks.map(() => (rng() - 0.5) * 4);

  const out: BeratCell[][] = [];

  for (let r = 0; r < height; r++) {
    // Gentle row undulation — rows breathe instead of running laser-straight.
    const rowWave = Math.sin(r * 0.45) * 1.5;
    const row: BeratCell[] = [];

    masks.forEach((mask, li) => {
      const w = mask[0]?.length ?? 0;
      const dyLetter = letterDy[li] ?? 0;
      for (let c = 0; c < w; c++) {
        if (mask[r]?.[c] !== " ") {
          const n = neighborCount(mask, r, c, height, w);
          // Torn edges: exposed cells randomly drop out so outlines are
          // jagged, not clean. Very exposed (n<=2): 30% drop. Edges (n<=4):
          // 15%. Stroke edges (n<=5): 6% — visibly rough but readable.
          if ((n <= 2 && rng() < 0.3) || (n <= 4 && rng() < 0.15) || (n <= 5 && rng() < 0.06)) {
            row.push({ ch: NBSP, dx: 0, dy: 0, rot: 0, scale: 1 });
            continue;
          }
          // Interior cores get the heaviest ink ($@B%8&WM#), edges get
          // lighter glyphs — classic ASCII-art shading.
          // 70% solid heavy char for readability, 30% texture variation.
          const v = (n / 8) * 0.6 + rng() * 0.5;
          const idx = Math.min(3, Math.floor(v * 4));
          let ch: string;
          if (rng() < 0.7) {
            ch = idx >= 2 ? "@" : idx === 1 ? "+" : ".";
          } else {
            const bucket = DENSITY[idx] ?? DENSITY[3];
            ch = bucket[Math.floor(rng() * bucket.length)] ?? "@";
          }
          const cell = jitterCell(rng, ch, rowWave);
          cell.dy += dyLetter;
          row.push(cell);
        } else {
          // Empty cell: faint halo noise only adjacent to the letters.
          // Slightly raised sprout chance (2.5% -> 4%) so stray light glyphs
          // pop just outside edges — rough, organic outline.
          if (isNearLetter(mask, r, c, height, w) && rng() < 0.04) {
            const ch = HALO[Math.floor(rng() * HALO.length)] ?? " ";
            const cell = jitterCell(rng, ch === " " ? NBSP : ch, rowWave);
            cell.dy += dyLetter;
            row.push(cell);
          } else {
            row.push({ ch: NBSP, dx: 0, dy: 0, rot: 0, scale: 1 });
          }
        }
      }
      // Letter gap.
      for (let g = 0; g < GAP_CELLS; g++) {
        row.push({ ch: NBSP, dx: 0, dy: 0, rot: 0, scale: 1 });
      }
    });
    out.push(row);
  }
  return out;
}

export function AsciiBerat() {
  // tick starts at 0 so SSR and first client render match (no hydration flash).
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Calmed: gentle shimmer every 2s instead of 0.45s — texture, not flicker.
    const id = window.setInterval(() => setTick((t) => t + 1), 2000);
    return () => window.clearInterval(id);
  }, []);

  const rows = useMemo(() => buildCells(tick), [tick]);

  return (
    <div data-ascii-berat aria-hidden="true" className="ascii-berat">
      {rows.map((cells, r) => (
        <div key={r} className="ascii-berat-row" aria-hidden="true">
          {cells.map((cell, c) =>
            cell.ch === NBSP ? (
              <span key={c} className="ascii-berat-cell" aria-hidden="true">
                {NBSP}
              </span>
            ) : (
              <span
                key={c}
                className="ascii-berat-cell"
                aria-hidden="true"
                style={{
                  transform: `translate(${cell.dx.toFixed(2)}px, ${cell.dy.toFixed(2)}px) rotate(${cell.rot.toFixed(2)}deg) scale(${cell.scale.toFixed(3)})`,
                }}
              >
                {cell.ch}
              </span>
            ),
          )}
        </div>
      ))}
    </div>
  );
}
