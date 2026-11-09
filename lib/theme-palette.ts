/** Accent hexes must match `[data-palette]` `--accent-neon` / `--effect-cursor`. */
export const THEME_PALETTES = {
  ocean: { label: "Ocean", accent: "#00d8ff", foreground: "#060a12", soft: "#9cf1ff" },
  orchid: { label: "Orchid", accent: "#a855f7", foreground: "#ffffff", soft: "#d8b4fe" },
  citrus: { label: "Citrus", accent: "#f59e0b", foreground: "#17120a", soft: "#fcd34d" },
  forest: { label: "Forest", accent: "#10b981", foreground: "#06130e", soft: "#6ee7b7" },
  rose: { label: "Rose", accent: "#f43f5e", foreground: "#ffffff", soft: "#fda4af" },
} as const;

export type ThemePalette = keyof typeof THEME_PALETTES;

export function isThemePalette(value: string | null | undefined): value is ThemePalette {
  return value !== null && value !== undefined && value in THEME_PALETTES;
}

export type ThemeSwatchRow = {
  /** null = the Base (no palette override) row. */
  readonly key: ThemePalette | null;
  readonly number: string;
  readonly label: string;
  readonly accent: string;
  readonly soft: string;
  readonly foreground: string;
};

/**
 * The Swatch Library rows (run 9, RUN9-THEME-SWATCHES): 00 BASE first,
 * then the five palettes in arc order. Base accent is the site default
 * --accent-neon (#7dd3fc, app/globals.css); its soft is the matching
 * sky-200 companion.
 */
export const THEME_SWATCH_ROWS: readonly ThemeSwatchRow[] = [
  {
    key: null,
    number: "00",
    label: "Base",
    accent: "#7dd3fc",
    soft: "#bae6fd",
    foreground: "#060a12",
  },
  ...Object.entries(THEME_PALETTES).map(([name, option], index) => ({
    key: name as ThemePalette,
    number: String(index + 1).padStart(2, "0"),
    label: option.label,
    accent: option.accent,
    soft: option.soft,
    foreground: option.foreground,
  })),
];
