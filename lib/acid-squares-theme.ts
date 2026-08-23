export type AcidSquaresTheme = {
  colors: [string, string, string];
  spread: number;
};

export const ACID_SQUARES_SPREAD_CEILING = 1.5;
export const ACID_SQUARES_HIGH_SPREAD_TONE_POWER = 0.1;

export function getAcidSquaresTheme(
  isDark: boolean,
  accent?: string,
): AcidSquaresTheme {
  const colors: [string, string, string] = isDark
    ? ["#000000", "#ffffff", "#000000"]
    : ["#ffffff", "#000000", "#ffffff"];

  if (accent) colors.fill(accent);

  return {
    colors,
    spread: isDark ? 1.17 : 0.24,
  };
}
