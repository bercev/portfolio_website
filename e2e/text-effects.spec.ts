import {
  attachRuntimeErrorCollector,
  expect,
  test,
} from "./runtime-errors";

test("keeps the particle identity semantically stable", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Berat Ercevik",
  );
  await expect(
    page.locator("#home .sr-only", { hasText: /^BERAT$/ }),
  ).toBeAttached();
  await expect(
    page.locator("#about .sr-only", { hasText: /^About$/ }),
  ).toBeAttached();

  await expect(page.locator("#home a")).toHaveCount(0);

  runtimeErrors.assertEmpty();
});

test("renders the Particle Text canvas in both themes", async ({
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

    const particleText = page.locator("[data-hero-particle-text]");
    const canvas = particleText.locator("canvas");
    await expect(particleText).toHaveAttribute(
      "data-particle-text-mode",
      "enhanced",
    );
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

test("tracks scroll with one Signal Spine and replays section headings", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  const spine = page.locator("[data-signal-spine]");
  const fill = spine.locator("[data-signal-fill]");
  await expect(spine).toHaveCount(1);
  await expect(spine).toHaveAttribute("data-signal-mode", "enhanced");
  await expect(page.locator('[data-warp-replay="true"]')).toHaveCount(6);

  const initialTransform = await fill.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect
    .poll(() => fill.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe(initialTransform);

  const experience = page.locator("#experience");
  const experienceHeading = experience.getByRole("heading", {
    level: 2,
    name: "Experience",
  });
  const glyph = experience.locator("[data-warp-glyph]").first();
  await experienceHeading.scrollIntoViewIfNeeded();
  await expect
    .poll(() => glyph.evaluate((element) => getComputedStyle(element).transform))
    .toBe("none");
  await expect(glyph).toHaveCSS("opacity", "1");

  await page.locator("#home").scrollIntoViewIfNeeded();
  await expect
    .poll(() => glyph.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe("none");
  await expect(glyph).toHaveCSS("opacity", "1");

  await experienceHeading.scrollIntoViewIfNeeded();
  await expect
    .poll(() => glyph.evaluate((element) => getComputedStyle(element).transform))
    .toBe("none");

  runtimeErrors.assertEmpty();
});

test("renders static Particle Text for reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  const root = page.locator("[data-hero-particle-text]");
  await expect(root).toHaveAttribute("data-particle-text-mode", "static");
  await expect(root.getByText("BERAT", { exact: true })).toBeVisible();
  await expect(root.locator("canvas")).toHaveCount(0);

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
