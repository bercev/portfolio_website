import {
  attachRuntimeErrorCollector,
  expect,
  test,
} from "./runtime-errors";

test("keeps the ASCII identity and project action semantically stable", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Berat Ercevik",
  );
  await expect(
    page.locator("#home .sr-only", { hasText: /^Berat$/ }),
  ).toBeAttached();
  await expect(
    page.locator("#about .sr-only", { hasText: /^About$/ }),
  ).toBeAttached();

  const action = page
    .locator("#home")
    .getByRole("link", { name: "View projects" });
  await expect(action).toHaveAttribute("href", "#projects");
  await expect(action).not.toHaveAttribute("target");

  runtimeErrors.assertEmpty();
});

test("keeps the ASCII name dense and readable in both themes", async ({
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

    const output = page.locator("[data-ascii-output]");
    await expect(output).not.toHaveText("");
    const glyphMetrics = await output.evaluate((element) => {
      const text = element.textContent ?? "";
      const cells = text.replace(/\n/g, "").length;
      const glyphs = text.replace(/\s/g, "");
      const strongGlyphs = glyphs.match(/[@&#B9]/g)?.length ?? 0;
      return {
        density: cells === 0 ? 0 : glyphs.length / cells,
        strongRatio: glyphs.length === 0 ? 0 : strongGlyphs / glyphs.length,
      };
    });
    expect(glyphMetrics.density).toBeGreaterThan(0.05);
    expect(glyphMetrics.strongRatio).toBeGreaterThan(0.5);

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

test("renders one stable ASCII frame for reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  const root = page.locator("[data-ascii-root]");
  const output = root.locator("pre[data-ascii-output]");
  await expect(root).toHaveAttribute("data-ascii-mode", "static");
  await expect(root).toHaveAttribute("data-ascii-profile", "static");
  await expect(output).not.toHaveText("");

  const firstFrame = await output.textContent();
  await page.waitForTimeout(200);
  await expect(output).toHaveText(firstFrame ?? "");

  runtimeErrors.assertEmpty();
  await context.close();
});

test("renders the hero name through canvas-generated ASCII output", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  const root = page.locator("[data-ascii-root]");
  await expect(root.locator("canvas[data-ascii-canvas]")).toBeAttached();
  await expect(root.locator("pre[data-ascii-output]")).not.toHaveText("");
  await expect(root).toHaveAttribute("data-ascii-mode", /^(animated|static)$/);

  const canvases = page.locator("canvas");
  expect(await canvases.count()).toBeGreaterThanOrEqual(3);
  for (const canvas of await canvases.all()) {
    expect(
      await canvas.evaluate(
        (element) => element.closest('[aria-hidden="true"]') !== null,
      ),
    ).toBe(true);
  }

  runtimeErrors.assertEmpty();
});
