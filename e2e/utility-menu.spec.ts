import {
  attachRuntimeErrorCollector,
  expect,
  test,
} from "./runtime-errors";

test("moves profile and appearance controls into the bubble menu", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await page.goto("/");

  const header = page.locator("header");
  await expect(header.locator('a[href="https://github.com/bercev"]')).toHaveCount(0);
  await expect(header.locator('[data-theme-selector]')).toHaveCount(0);

  const trigger = page.getByRole("button", { name: "Open utility menu" });
  await trigger.click();

  const menu = page.getByRole("navigation", { name: "Utility menu" });
  await expect(menu.locator("[data-bubble-menu-item]")).toHaveCount(5);
  await expect(menu.locator('a[href^="#"]')).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/bercev",
  );
  await expect(menu.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    "https://linkedin.com/in/berat-ercevik",
  );
  await expect(menu.getByRole("link", { name: "Resume" })).toHaveAttribute(
    "href",
    "/assets/documents/resume.pdf",
  );
  await expect(
    menu.getByRole("button", { name: "Switch to dark theme" }),
  ).toBeVisible();
  await expect(
    menu.getByRole("button", { name: "Color theme: Ocean" }),
  ).toBeVisible();

  runtimeErrors.assertEmpty();
});

test("changes the display mode and color palette from the utility menu", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.addInitScript(() => {
    localStorage.setItem("theme", "light");
    localStorage.setItem("theme-palette", "ocean");
  });
  await page.goto("/");

  await page.getByRole("button", { name: "Open utility menu" }).click();
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);

  await page.getByRole("button", { name: "Color theme: Ocean" }).click();
  await page
    .getByRole("button", { name: "Rose color theme" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-palette", "rose");

  runtimeErrors.assertEmpty();
});

test("clears the palette override when its selected swatch is clicked", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("theme-palette", "rose"));
  await page.goto("/");

  await page.getByRole("button", { name: "Open utility menu" }).click();
  const selector = page.locator("[data-theme-selector]");
  await selector
    .locator('button[aria-label="Color theme: Rose"]')
    .evaluate((button: HTMLButtonElement) => button.click());
  await selector
    .locator('button[aria-label="Rose color theme, selected"]')
    .evaluate((button: HTMLButtonElement) => button.click());

  await expect(page.locator("html")).not.toHaveAttribute("data-palette");
  await expect(
    selector.locator('button[aria-label="Color theme: Base"]'),
  ).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem("theme-palette"))).toBe(
    "none",
  );

  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-palette");
  await page.getByRole("button", { name: "Open utility menu" }).click();
  await expect(
    page.locator(
      '[data-theme-selector] button[aria-label="Color theme: Base"]',
    ),
  ).toHaveCount(1);
});

test("keeps every utility icon close to the main menu trigger", async ({
  page,
}) => {
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Open utility menu" });
  await trigger.click();

  const triggerBox = await trigger.boundingBox();
  expect(triggerBox).not.toBeNull();
  const triggerCenter = {
    x: triggerBox!.x + triggerBox!.width / 2,
    y: triggerBox!.y + triggerBox!.height / 2,
  };

  const iconCenters = await page
    .locator("[data-bubble-menu-item]")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      }),
    );

  expect(iconCenters).toHaveLength(5);
  for (const center of iconCenters) {
    expect(
      Math.hypot(center.x - triggerCenter.x, center.y - triggerCenter.y),
    ).toBeLessThanOrEqual(76);
  }
});

test("anchors the swatch plate to the theme trigger", async ({
  page,
}) => {
  // Run-9 Swatch Library (RUN9-THEME-SWATCHES): the run-8 arc fanned
  // five dots around the trigger and this test pinned the middle dot's
  // centering; the plate retires the arc, so the pinned invariant is now
  // the plate's anchoring — it opens from the trigger, stays inside the
  // viewport, and lists all six swatches by name.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const menuTrigger = page.getByRole("button", { name: "Open utility menu" });
  await menuTrigger.click();
  await page.getByRole("button", { name: /Color theme:/ }).click();

  const plate = page.locator("#theme-palette-options");
  await expect(plate).toBeVisible();
  const plateBox = await plate.boundingBox();
  const themeTrigger = page.getByRole("button", { name: /Color theme:/ });
  const themeTriggerBox = await themeTrigger.boundingBox();
  expect(plateBox).not.toBeNull();
  expect(themeTriggerBox).not.toBeNull();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(plateBox!.x).toBeGreaterThanOrEqual(0);
  expect(plateBox!.y).toBeGreaterThanOrEqual(0);
  expect(plateBox!.x + plateBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(plateBox!.y + plateBox!.height).toBeLessThanOrEqual(viewport!.height);
  // The plate's right edge sits on the theme trigger's right edge — it
  // opens leftward from the trigger, never past the viewport. (The 8px
  // tolerance absorbs the fan plates' slight rotation, which inflates
  // both bounding boxes by a few px; the layout edges align exactly.)
  expect(
    Math.abs(
      plateBox!.x + plateBox!.width -
        (themeTriggerBox!.x + themeTriggerBox!.width),
    ),
  ).toBeLessThanOrEqual(8);

  for (const name of ["Base", "Ocean", "Orchid", "Citrus", "Forest", "Rose"]) {
    await expect(
      page.getByRole("button", { name: `${name} color theme` }),
    ).toBeVisible();
  }
});
