export type AcidSquaresTheme = {
  colors: [string, string, string];
  spread: number;
  /** Light paper uses ink-on-paper wash; dark uses additive caustic glow. */
  inkOnPaper: boolean;
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
 * Liquid field: paper/void, ink body, caustic highlight. Accent tints only
 * the ink stop — darkened first when it sits on paper — so the wash keeps
 * depth instead of collapsing into one flat color.
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

  // Dark: lift the caustic toward a cool glint. Light: push the ridge
  // deeper than the ink body so it stains paper instead of bleaching out.
  const highlight = isDark
    ? mix(ink, "#d8eef5", 0.42)
    : mix(ink, LIGHT_INK, 0.55);

  return {
    colors: [base, ink, highlight],
    spread: isDark ? 0.42 : 0.36,
    inkOnPaper: !isDark,
  };
}
