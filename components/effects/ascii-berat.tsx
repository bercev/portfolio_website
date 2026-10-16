"use client";

import { useMemo } from "react";

/**
 * BERAT as hand-designed DOM ASCII art.
 *
 * Replaces the 3D volumetric particle wordmark (which rendered as unreadable
 * noise) with a large, crisp <pre> block-letter wordmark in the phosphor
 * terminal aesthetic. Each letter is 17x17 on a consistent grid, built from
 * solid block characters for maximum readability.
 */

/* Each letter is 17 rows x 17 cols. Designed on a uniform grid. */
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

function buildArt(): string {
  const rows: string[] = [];
  const totalRows = LETTER_B.length;
  for (let r = 0; r < totalRows; r++) {
    const parts = WORD.split("").map((ch) => {
      const letter = LETTERS[ch];
      return letter[r] ?? "";
    });
    // Pad each letter row to 17 cols so the grid stays aligned.
    const padded = parts.map((p) => p.padEnd(17, " "));
    rows.push(padded.join(GAP));
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
