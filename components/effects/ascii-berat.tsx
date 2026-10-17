"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * BERAT as classic ASCII art.
 *
 * The letterforms below are density masks. At render time each filled cell
 * is mapped through a seeded noise function to a classic ASCII density ramp
 * (printable ASCII only — $@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\|()1{}[]?-_+~<>i!lI;:,"^`'.).
 * Interior cells get the heaviest "ink" (@#$%&), edges get lighter glyphs,
 * so the wordmark reads as B-E-R-A-T while looking unmistakably like
 * hand-rolled ASCII art — never block characters. A slow tick re-rolls the
 * glyphs so the texture shimmers without the letterforms ever moving.
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
const GAP = "    "; // 4-space gap between letters for clear separation

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

function buildArt(tick: number): string {
  const rng = mulberry32(1337 + tick * 7919);
  const masks = WORD.split("").map((ch) => {
    const rows = LETTERS[ch] ?? [];
    const w = Math.max(...rows.map((r) => r.length));
    return rows.map((r) => r.padEnd(w, " "));
  });
  const height = masks[0]?.length ?? 0;
  const out: string[] = [];

  for (let r = 0; r < height; r++) {
    const parts = masks.map((mask) => {
      const w = mask[0]?.length ?? 0;
      let line = "";
      for (let c = 0; c < w; c++) {
        if (mask[r][c] !== " ") {
          // Filled cell: 8-neighbor count -> interior-ness -> density bucket.
          let n = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const rr = r + dr;
              const cc = c + dc;
              if (rr >= 0 && rr < height && cc >= 0 && cc < w && mask[rr][cc] !== " ") n++;
            }
          }
          // Interior cores get the heaviest ink ($@B%8&WM#), edges get
          // lighter glyphs — classic ASCII-art shading. The tick re-roll
          // cycles characters within the same density bucket, so the
          // texture shimmers while letterforms never move.
          const v = (n / 8) * 0.6 + rng() * 0.5;
          const idx = Math.min(3, Math.floor(v * 4));
          const bucket = DENSITY[idx] ?? DENSITY[3];
          line += bucket[Math.floor(rng() * bucket.length)] ?? "@";
        } else {
          // Empty cell: faint halo noise only adjacent to the letters.
          let near = false;
          for (let dr = -1; dr <= 1 && !near; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const rr = r + dr;
              const cc = c + dc;
              if (rr >= 0 && rr < height && cc >= 0 && cc < w && mask[rr][cc] !== " ") {
                near = true;
                break;
              }
            }
          }
          line += near && rng() < 0.025 ? (HALO[Math.floor(rng() * HALO.length)] ?? " ") : " ";
        }
      }
      return line;
    });
    out.push(parts.join(GAP));
  }
  return out.join("\n");
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

  const art = useMemo(() => buildArt(tick), [tick]);

  return (
    <pre data-ascii-berat aria-hidden="true" className="ascii-berat">
      {art}
    </pre>
  );
}
