"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * BERAT as organic RNG-style ASCII art.
 *
 * The letterforms below are density masks (█ = filled, space = empty).
 * At render time each filled cell is mapped through a seeded noise function:
 * interior cells get dense glyphs (█▓), edges get lighter ones (▒░), and a
 * sprinkle of BBS-style texture glyphs (#$%&?/ etc.) plus Braille gives the
 * "emerged from noise" feel. A slow tick re-rolls the noise so the wordmark
 * shimmers without ever losing readability — the mask never changes.
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

/** Density ramp: index 0 = lightest edge, 3 = solid core. */
const RAMP: readonly string[] = ["░", "▒", "▓", "█"];

/** Texture sprinkles keyed by ramp level — same visual density, RNG flavor. */
const TEXTURE: Readonly<Record<number, readonly string[]>> = {
  3: ["█", "█", "▓", "#", "%", "@", "⣿"],
  2: ["▓", "▓", "▒", "$", "&", "+", "⡿"],
  1: ["▒", "▒", "░", ":", "=", "*", "⠿"],
  0: ["░", "░", "░", ".", "·", " "],
};

/** Sparse static around the letters — the "emerged from noise" halo. */
const HALO: readonly string[] = ["·", "˙", " "];

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
          // Filled cell: 8-neighbor count -> interior-ness -> density.
          let n = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const rr = r + dr;
              const cc = c + dc;
              if (rr >= 0 && rr < height && cc >= 0 && cc < w && mask[rr][cc] !== " ") n++;
            }
          }
          // Cores get texture too — organic throughout, not just edges.
          // Higher noise = more RNG feel, but letterforms stay readable via the mask.
          const v = (n / 8) * 0.55 + rng() * 0.55;
          const idx = Math.min(3, Math.floor(v * 4));
          let g = RAMP[idx] ?? "█";
          if (rng() < 0.35) {
            const bucket = TEXTURE[idx] ?? RAMP;
            g = bucket[Math.floor(rng() * bucket.length)] ?? g;
          }
          line += g;
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
    const id = window.setInterval(() => setTick((t) => t + 1), 450);
    return () => window.clearInterval(id);
  }, []);

  const art = useMemo(() => buildArt(tick), [tick]);

  return (
    <pre data-ascii-berat aria-hidden="true" className="ascii-berat">
      {art}
    </pre>
  );
}
