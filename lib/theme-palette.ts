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
