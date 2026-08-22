export type PrismaticPalette = {
  background: string;
  colors: string[];
};

export function getPrismaticPalette(isDark: boolean, accent = "#00d8ff"): PrismaticPalette {
  return isDark
    ? {
        background: "#000000",
        colors: ["#000000", accent, "#000000"],
      }
    : {
        background: "#ffffff",
        colors: ["#ffffff", accent, "#ffffff"],
      };
}
