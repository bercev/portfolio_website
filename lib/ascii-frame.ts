const DEFAULT_GLYPHS = " .,:;irsXA253hMHGS#9B&@";

export function luminanceToGlyph(
  luminance: number,
  glyphs = DEFAULT_GLYPHS,
): string {
  if (glyphs.length === 0) return " ";

  const value = Math.min(255, Math.max(0, luminance));
  const index = Math.round((value / 255) * (glyphs.length - 1));
  return glyphs[index] ?? glyphs[glyphs.length - 1] ?? " ";
}

export function imageDataToAscii({
  data,
  width,
  height,
  cellSize,
  glyphs = DEFAULT_GLYPHS,
}: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  cellSize: number;
  glyphs?: string;
}): string {
  const size = Math.max(1, Math.floor(cellSize));
  const rows: string[] = [];

  for (let y = 0; y < height; y += size) {
    let row = "";

    for (let x = 0; x < width; x += size) {
      let luminance = 0;
      let samples = 0;

      for (let sampleY = y; sampleY < Math.min(y + size, height); sampleY += 1) {
        for (let sampleX = x; sampleX < Math.min(x + size, width); sampleX += 1) {
          const offset = (sampleY * width + sampleX) * 4;
          const red = data[offset] ?? 0;
          const green = data[offset + 1] ?? 0;
          const blue = data[offset + 2] ?? 0;
          const alpha = (data[offset + 3] ?? 0) / 255;

          luminance += (red * 0.2126 + green * 0.7152 + blue * 0.0722) * alpha;
          samples += 1;
        }
      }

      row += luminanceToGlyph(samples === 0 ? 0 : luminance / samples, glyphs);
    }

    rows.push(row);
  }

  return rows.join("\n");
}
