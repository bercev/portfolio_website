"use client";

import { useMemo } from "react";

/**
 * BERAT as hand-designed DOM ASCII art.
 *
 * Replaces the 3D volumetric particle wordmark (which rendered as unreadable
 * noise) with a large, crisp <pre> block-letter wordmark in the phosphor
 * terminal aesthetic. Each letter is ~17 rows tall, built from block
 * characters with subtle shading for depth.
 */

/* Each letter is 17 rows. Designed on a grid for clean block letterforms. */
const LETTER_B: readonly string[] = [
  "█████████████",
  "███████████████",
  "█████     █████",
  "████       ████",
  "████       ████",
  "████       ████",
  "█████     █████",
  "███████████████",
  "█████████████",
  "█████     █████",
  "████       ████",
  "████       ████",
  "████       ████",
  "████       ████",
  "█████     █████",
  "███████████████",
  "█████████████",
];

const LETTER_E: readonly string[] = [
  "███████████████",
  "███████████████",
  "█████",
  "█████",
  "█████",
  "█████",
  "█████",
  "████████████",
  "████████████",
  "█████",
  "█████",
  "█████",
  "█████",
  "█████",
  "█████",
  "███████████████",
  "███████████████",
];

const LETTER_R: readonly string[] = [
  "█████████████",
  "███████████████",
  "█████     █████",
  "████       ████",
  "████       ████",
  "████       ████",
  "█████     █████",
  "███████████████",
  "████████████",
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
  "    █████████",
  "  █████████████",
  " ██████   ██████",
  "█████       █████",
  "█████       █████",
  "█████       █████",
  "█████       █████",
  "█████████████████",
  "█████████████████",
  "█████       █████",
  "█████       █████",
  "█████       █████",
  "█████       █████",
  "█████       █████",
  "█████       █████",
  "█████       █████",
  "█████       █████",
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
const GAP = "   "; // 3-space gap between letters

/**
 * Apply subtle phosphor shading: bottom third of the glyph uses ▓ for a
 * gradient falloff, giving the letters depth without hurting readability.
 * A few deterministic "signal" cells render in amber.
 */
function shadeRow(row: string, rowIndex: number, totalRows: number): string {
  // Bottom ~35% gets ▓ shading for a phosphor gradient.
  const shadeStart = Math.floor(totalRows * 0.65);
  if (rowIndex < shadeStart) return row;
  return row.replace(/█/g, "▓");
}

function buildArt(): string {
  const rows: string[] = [];
  const totalRows = LETTER_B.length;
  for (let r = 0; r < totalRows; r++) {
    const parts = WORD.split("").map((ch) => {
      const letter = LETTERS[ch];
      const raw = letter[r] ?? "";
      return shadeRow(raw, r, totalRows);
    });
    rows.push(parts.join(GAP));
  }
  return rows.join("\n");
}

export function AsciiBerat() {
  const art = useMemo(() => buildArt(), []);
  return (
    <pre
      data-ascii-berat
      aria-hidden="true"
      className="ascii-berat"
    >
      {art}
    </pre>
  );
}
