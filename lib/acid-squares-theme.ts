export type AcidSquaresTheme = {
  colors: [string, string, string];
  spread: number;
};

export const ACID_SQUARES_SPREAD_CEILING = 1.5;
export const ACID_SQUARES_HIGH_SPREAD_TONE_POWER = 0.1;

/** Ink tone the accent is allowed to reach before it stops reading as paper. */
const LIGHT_INK = "#0b1220";
const LIGHT_INK_MIX = 0.62;

function parseHex(value: string): [number, number, number] | null {
  const hex = value.trim().replace(/^#/, "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function mix(from: string, to: string, amount: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) return from;
  const channel = (index: number) =>
    Math.round(a[index] + (b[index] - a[index]) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

/**
 * The tunnel needs a light base and a dark ink to keep its depth. Tinting all
 * three stops with the accent collapses that contrast into one flat wash, so
 * the accent only takes the ink stop — darkened first when it sits on paper.
 */
export function getAcidSquaresTheme(
  isDark: boolean,
  accent?: string,
): AcidSquaresTheme {
  const base = isDark ? "#000000" : "#ffffff";
  const defaultInk = isDark ? "#ffffff" : "#000000";
  const ink = accent
    ? isDark
      ? accent
      : mix(accent, LIGHT_INK, LIGHT_INK_MIX)
    : defaultInk;

  return {
    colors: [base, ink, base],
    spread: isDark ? 0.3 : 0.22,
  };
}
