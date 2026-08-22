export type PrismaticPalette = {
  background: string;
  colors: string[];
};

export function getPrismaticPalette(isDark: boolean): PrismaticPalette {
  return isDark
    ? {
        background: "#05090d",
        colors: ["#ffffff", "#00d8ff", "#78ecff"],
      }
    : {
        background: "#f7fbfd",
        colors: ["#05090d", "#00aeca", "#ffffff"],
      };
}
