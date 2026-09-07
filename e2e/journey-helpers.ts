import type { Browser, Page } from "@playwright/test";

import { attachRuntimeErrorCollector, expect } from "./runtime-errors";

export async function readJourneyT(page: Page) {
  const raw = await page
    .locator("[data-journey-scene]")
    .getAttribute("data-journey-t");
  return raw == null ? Number.NaN : Number(raw);
}

export async function openThemedJourney(
  browser: Browser,
  theme: "light" | "dark",
) {
  const context = await browser.newContext({ colorScheme: theme });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.addInitScript((value) => {
    localStorage.setItem("theme", value);
  }, theme);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-journey", "active");
  return { context, page, runtimeErrors };
}

/** Count high-contrast pixels in the hero glyph band — the BERAT particle field. */
export async function measureHeroWordmarkInk(page: Page) {
  const band = page.locator("[data-hero-glyph-band]");
  await expect(band).toBeVisible();
  const box = await band.boundingBox();
  if (!box) {
    return { inkRatio: 0, columnHits: 0, widthSpan: 0 };
  }

  const png = await page.screenshot({
    clip: {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.max(1, box.width),
      height: Math.max(1, box.height),
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
        const marked = isDark
          ? luma > 36 && chroma > 12
          : luma < 210 || chroma > 28;
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
