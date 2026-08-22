export type PrismaticPalette = {
  background: string;
  colors: string[];
};

export function getPrismaticPalette(isDark: boolean): PrismaticPalette {
  return isDark
    ? {
        background: "#000000",
        colors: ["#000000", "#00d8ff", "#000000"],
      }
    : {
        background: "#ffffff",
        colors: ["#ffffff", "#00d8ff", "#ffffff"],
      };
}
