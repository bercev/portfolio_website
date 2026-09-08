import type { Page } from "@playwright/test";

import { expect } from "./runtime-errors";

export async function readJourneyT(page: Page) {
  const raw = await page
    .locator("[data-journey-scene]")
    .getAttribute("data-journey-t");
  return raw == null ? Number.NaN : Number(raw);
}

/** Average luma of a small hero backdrop sample — theme lockstep checks. */
export async function readHeroBackdropLuma(page: Page) {
  const png = await page.screenshot({
    clip: { x: 12, y: 96, width: 56, height: 56 },
    type: "png",
  });

  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let luma = 0;
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      luma += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    return luma / Math.max(1, pixels);
  }, png.toString("base64"));
}

/** Count high-contrast pixels where the BERAT particle field is framed. */
export async function measureHeroWordmarkInk(page: Page) {
  const home = page.locator("#home");
  await expect(home).toBeVisible();
  const box = await home.boundingBox();
  if (!box) {
    return { inkRatio: 0, columnHits: 0, widthSpan: 0 };
  }

  const png = await page.screenshot({
    clip: {
      x: Math.max(0, box.x + 72),
      y: Math.max(0, box.y + box.height * 0.12),
      width: Math.max(1, box.width - 96),
      height: Math.max(1, box.height * 0.58),
    },
    type: "png",
  });

  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { inkRatio: 0, columnHits: 0, widthSpan: 0 };
    ctx.drawImage(image, 0, 0);
    const { data, width, height } = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const isDark = document.documentElement.classList.contains("dark");
    const columns = 8;
    const hits = new Array<number>(columns).fill(0);
    let ink = 0;
    let minX = width;
    let maxX = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);
        const marked = isDark ? luma > 28 && chroma > 8 : chroma > 8;
        if (!marked) continue;
        ink += 1;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        hits[Math.min(columns - 1, Math.floor((x / width) * columns))] += 1;
      }
    }

    const total = Math.max(1, width * height);
    const columnThreshold = (total / columns) * 0.004;
    return {
      inkRatio: ink / total,
      columnHits: hits.filter((count) => count > columnThreshold).length,
      widthSpan: ink === 0 ? 0 : (maxX - minX) / width,
    };
  }, png.toString("base64"));
}
