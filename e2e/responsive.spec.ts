import type { Locator } from "@playwright/test";

import {
  attachRuntimeErrorCollector,
  expect,
  test,
} from "./runtime-errors";

const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const SECTION_IDS = [
  "home",
  "about",
  "publications",
  "experience",
  "projects",
  "skills",
  "contact",
] as const;

type ElementBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

async function getBoxes(locator: Locator): Promise<ElementBox[]> {
  return locator.evaluateAll((elements) =>
    elements.map((element) => {
      const { height, width, x, y } = element.getBoundingClientRect();
      return { height, width, x, y };
    }),
  );
}

async function expectSingleColumn(locator: Locator) {
  const boxes = await getBoxes(locator);
  expect(boxes.length).toBeGreaterThan(1);

  for (let index = 1; index < boxes.length; index += 1) {
    const previous = boxes[index - 1];
    const current = boxes[index];

    // Children stack vertically rather than sitting side-by-side.
    expect(current.y).toBeGreaterThanOrEqual(previous.y + previous.height - 1);
    // Children share a horizontal band (left-aligned or centered both overlap),
    // so no child is squeezed into a disjoint off-center column.
    const overlapsHorizontal =
      current.x < previous.x + previous.width &&
      previous.x < current.x + current.width;
    expect(overlapsHorizontal).toBe(true);
  }
}

test("keeps every multi-column section readable at 390px", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.goto("/");

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  await expect(page.locator("#home")).toHaveCSS("min-height", "844px");
  await expect(
    page.locator("#home").getByRole("link", { name: "View projects" }),
  ).toBeInViewport({ ratio: 1 });

  const asciiBounds = await page.locator("[data-ascii-root]").boundingBox();
  expect(asciiBounds).not.toBeNull();
  expect(asciiBounds!.x).toBeGreaterThanOrEqual(0);
  expect(asciiBounds!.x + asciiBounds!.width).toBeLessThanOrEqual(
    MOBILE_VIEWPORT.width,
  );

  await expectSingleColumn(page.locator("#home > div > *"));
  await expectSingleColumn(
    page.locator("#about > div > div:nth-child(2) > *"),
  );
  for (const article of await page.locator("[data-publication-row]").all()) {
    await expectSingleColumn(article.locator(":scope > *"));
  }
  await expectSingleColumn(
    page.locator("#projects > div > div:nth-child(2) > *"),
  );
  await expectSingleColumn(page.locator("#contact footer > div > *"));

  for (const article of await page.locator("#experience article").all()) {
    await expectSingleColumn(article.locator(":scope > *"));
  }

  const contentBlocks = page.locator(
    "#about [data-education-panel], #publications [data-publication-row], #experience article, #projects [data-portfolio-card]",
  );
  await expect(contentBlocks).toHaveCount(9);

  for (const { width, x } of await getBoxes(contentBlocks)) {
    expect(width).toBeGreaterThanOrEqual(320);
    expect(x).toBeGreaterThanOrEqual(16);
    expect(x + width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width - 16 + 1);
  }

  runtimeErrors.assertEmpty();
  await context.close();
});

test("keeps the mobile menu above the safe area and keyboard accessible", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.goto("/");

  const trigger = page.getByRole("button", {
    name: "Open section navigation",
  });
  const firstLink = page.getByRole("link", { name: "Home", exact: true });

  const closedBox = await trigger.boundingBox();
  expect(closedBox).not.toBeNull();
  expect(
    MOBILE_VIEWPORT.height - closedBox!.y - closedBox!.height,
  ).toBeGreaterThanOrEqual(16);

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("link", { name: "Contact", exact: true }),
  ).toBeVisible();

  const navigationBox = await page
    .getByRole("navigation", { name: "Section navigation" })
    .boundingBox();
  expect(navigationBox).not.toBeNull();
  expect(
    MOBILE_VIEWPORT.height - navigationBox!.y - navigationBox!.height,
  ).toBeGreaterThanOrEqual(16);

  await page.keyboard.press("Tab");
  await expect(firstLink).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();

  runtimeErrors.assertEmpty();
  await context.close();
});

test("renders static, fully visible content for reduced motion", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.clock.install();
  await page.goto("/");

  await expect(page.locator("[data-effect-mode]")).toHaveAttribute(
    "data-effect-mode",
    "static",
  );
  await expect(page.locator("[data-pixel-trail]")).toHaveCount(0);
  await expect(page.locator("[data-click-spark]")).toHaveCount(0);

  const skillTracks = page.locator("[data-skills-track]");
  await expect(skillTracks).toHaveCount(2);
  for (const track of await skillTracks.all()) {
    await expect(track).toHaveCSS("animation-name", "none");
    await expect(track).toHaveCSS("transform", "none");
  }

  const sectionHeadings = page.locator("main > section:not(#home) h2");
  await expect(sectionHeadings).toHaveCount(6);
  for (const heading of await sectionHeadings.all()) {
    const glyphs = heading.locator('span[aria-hidden="true"] > span');
    expect(await glyphs.count()).toBeGreaterThan(0);

    for (const glyph of await glyphs.all()) {
      await expect(glyph).toHaveCSS("opacity", "1");
      await expect(glyph).toHaveCSS("transform", "none");
    }
  }

  const asciiRoot = page.locator("[data-ascii-root]");
  await expect(asciiRoot).toHaveAttribute("data-ascii-mode", "static");
  await expect(asciiRoot.locator("[data-ascii-output]")).not.toHaveText("");
  await expect(
    page.locator("#home").getByText(/full-stack applications/i),
  ).toBeVisible();

  for (const id of SECTION_IDS) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await expect(page.locator("[data-skills-original]")).toHaveCount(2);
  for (const skillsRow of await page.locator("[data-skills-original]").all()) {
    await expect(skillsRow).toBeVisible();
  }

  runtimeErrors.assertEmpty();
  await context.close();
});

test("mounts pointer effects only for a fine pointer", async ({ browser }) => {
  const fineContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const finePage = await fineContext.newPage();
  const fineRuntimeErrors = attachRuntimeErrorCollector(finePage);

  await finePage.goto("/");
  await expect(finePage.locator("[data-effect-mode]")).toHaveAttribute(
    "data-effect-mode",
    "enhanced",
  );
  await expect(finePage.locator("[data-pixel-trail]")).toHaveCount(1);
  await expect(finePage.locator("[data-click-spark]")).toHaveCount(1);
  fineRuntimeErrors.assertEmpty();
  await fineContext.close();

  const coarseContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    hasTouch: true,
  });
  const coarsePage = await coarseContext.newPage();
  const coarseRuntimeErrors = attachRuntimeErrorCollector(coarsePage);

  await coarsePage.goto("/");
  await expect(coarsePage.locator("[data-effect-mode]")).toHaveAttribute(
    "data-effect-mode",
    "mobile",
  );
  await expect(coarsePage.locator("[data-pixel-trail]")).toHaveCount(0);
  await expect(coarsePage.locator("[data-click-spark]")).toHaveCount(0);
  coarseRuntimeErrors.assertEmpty();
  await coarseContext.close();
});

const SNAPSHOT_SECTIONS = [
  { id: "home", name: "hero" },
  { id: "about", name: "about" },
  { id: "publications", name: "publications" },
  { id: "experience", name: "experience" },
  { id: "projects", name: "projects" },
  { id: "skills", name: "skills" },
  { id: "contact", name: "contact" },
] as const;

for (const theme of ["light", "dark"] as const) {
  test(`matches the approved ${theme} full-page and section baselines`, async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await page.emulateMedia({
      colorScheme: theme,
      reducedMotion: "reduce",
    });
    await page.addInitScript((storedTheme) => {
      localStorage.setItem("theme", storedTheme);
    }, theme);
    await page.goto("/");
    await expect(page.locator("nextjs-portal")).toHaveCount(0);

    await expect(page.locator("html")).toHaveClass(
      new RegExp(`(^|\\s)${theme}(\\s|$)`),
    );
    await expect(page.locator("[data-effect-mode]")).toHaveAttribute(
      "data-effect-mode",
      "static",
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images, (image) =>
          image.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => resolve(), { once: true });
              }),
        ),
      );
      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => resolve()),
        ),
      );
    });

    const stableClassName = await page.locator("html").getAttribute("class");
    await expect(page.locator("html")).toHaveClass(stableClassName ?? "");

    await expect(page).toHaveScreenshot(`${theme}-full-page.png`, {
      animations: "disabled",
      caret: "hide",
      fullPage: true,
      scale: "css",
    });

    for (const section of SNAPSHOT_SECTIONS) {
      await expect(page.locator(`#${section.id}`)).toHaveScreenshot(
        `${theme}-${section.name}.png`,
        {
          animations: "disabled",
          caret: "hide",
          scale: "css",
        },
      );
      await expect(page.locator("html")).toHaveClass(stableClassName ?? "");
    }
  });
}
