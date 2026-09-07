import {
  attachRuntimeErrorCollector,
  expect,
  test,
} from "./runtime-errors";
import { measureHeroWordmarkInk, readJourneyT } from "./journey-helpers";

test("keeps the journey identity semantically stable", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Berat Ercevik",
  );
  await expect(page.locator("#home a")).toHaveCount(0);

  runtimeErrors.assertEmpty();
});

test("keeps BERAT particle ink measurable on the journey canvas", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-journey", "active");
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator("[data-hero-name-fallback]")).toBeHidden();
  await expect.poll(() => readJourneyT(page)).toBeLessThan(0.03);
  const ink = await measureHeroWordmarkInk(page);
  expect(ink.inkRatio, `ink=${JSON.stringify(ink)}`).toBeGreaterThan(0.012);
  expect(ink.columnHits).toBeGreaterThanOrEqual(3);
  expect(ink.widthSpan).toBeGreaterThan(0.25);
  runtimeErrors.assertEmpty();
});

test("renders the journey canvas in both themes", async ({
  browser,
}) => {
  for (const theme of ["light", "dark"] as const) {
    const context = await browser.newContext({ colorScheme: theme });
    const page = await context.newPage();
    const runtimeErrors = attachRuntimeErrorCollector(page);
    await page.addInitScript((value) => {
      localStorage.setItem("theme", value);
    }, theme);
    await page.goto("/");

    const canvas = page.locator("[data-journey-scene]");
    await expect(page.locator("html")).toHaveAttribute("data-journey", "active");
    await expect(canvas).toBeVisible();
    const canvasBounds = await canvas.boundingBox();
    expect(canvasBounds).not.toBeNull();
    expect(canvasBounds!.width).toBeGreaterThan(800);
    expect(canvasBounds!.height).toBeGreaterThan(200);
    expect(
      await canvas.evaluate(
        (element) => {
          const canvasElement = element as HTMLCanvasElement;
          return Boolean(
            canvasElement.getContext("webgl2") ??
              canvasElement.getContext("webgl"),
          );
        },
      ),
    ).toBe(true);

    runtimeErrors.assertEmpty();
    await context.close();
  }
});

test("tracks scroll with the sidebar progress line", async ({ page }) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  const sidebar = page.locator("[data-line-sidebar]");
  await expect(page.locator("html")).toHaveAttribute("data-journey", "active");
  await expect(sidebar).toBeVisible();

  const initial = await sidebar.evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--progress").trim(),
  );
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      sidebar.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--progress").trim(),
      ),
    )
    .not.toBe(initial);

  runtimeErrors.assertEmpty();
});

test("renders a flat hero name for reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  await expect(page.locator("html")).not.toHaveAttribute("data-journey");
  const fallback = page.locator("[data-hero-name-fallback]");
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveText("BERAT");

  runtimeErrors.assertEmpty();
  await context.close();
});

test("previews scrollable publication PDFs from pointer and keyboard intent", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  const previewTargets = page.locator("[data-hover-preview]");
  const skillPreview = previewTargets.filter({ hasText: "SkillOptimizer" });
  const grokSetPreview = previewTargets.filter({ hasText: "@GrokSet" });
  const skillOptimizer = skillPreview.getByRole("link", {
    name: /SkillOptimizer/,
  });
  const grokSet = grokSetPreview.getByRole("link", { name: /@GrokSet/ });

  await expect(previewTargets).toHaveCount(2);
  await expect(page.locator("#publications img")).toHaveCount(0);
  for (const pdfUrl of [
    "/assets/publications/skilloptimizer.pdf",
    "/assets/publications/grokset.pdf",
  ]) {
    expect((await page.request.get(pdfUrl)).ok()).toBe(true);
  }

  const titleBox = await skillOptimizer.boundingBox();
  expect(titleBox).not.toBeNull();
  expect(titleBox!.width).toBeGreaterThan(500);

  await skillOptimizer.hover();
  const skillReader = skillPreview.locator("[data-pdf-reader]");
  const skillFrame = skillReader.getByTitle("SkillOptimizer PDF preview");
  await expect(skillReader).toBeVisible();
  await expect
    .poll(async () => (await skillReader.boundingBox())?.width ?? 0)
    .toBeGreaterThanOrEqual(520);
  const readerBox = await skillReader.boundingBox();
  expect(readerBox).not.toBeNull();
  const titleToReaderGap = readerBox!.x - (titleBox!.x + titleBox!.width);
  expect(titleToReaderGap).toBeGreaterThanOrEqual(0);
  expect(titleToReaderGap).toBeLessThanOrEqual(24);
  await expect(skillFrame).toHaveAttribute(
    "src",
    "/assets/publications/skilloptimizer.pdf#page=1&view=FitH&toolbar=0&navpanes=0",
  );
  await expect(skillReader).toHaveCSS("pointer-events", "auto");

  await skillReader.hover();
  await page.waitForTimeout(250);
  await expect(skillReader).toBeVisible();

  await page.mouse.move(0, 0);
  await grokSet.focus();
  await expect(
    grokSetPreview.getByTitle("@GrokSet PDF preview"),
  ).toBeVisible();

  await expect(skillOptimizer).toHaveAttribute(
    "href",
    "https://openreview.net/forum?id=nZYF0aPAMP",
  );
  await expect(grokSet).toHaveAttribute(
    "href",
    "https://arxiv.org/abs/2602.21236",
  );

  runtimeErrors.assertEmpty();
});
