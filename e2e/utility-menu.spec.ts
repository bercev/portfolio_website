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
    "/resume.pdf",
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
