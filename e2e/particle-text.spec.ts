import {
  attachRuntimeErrorCollector,
  expect,
  test,
} from "./runtime-errors";

test("renders BERAT as interactive Particle Text on capable devices", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  const heading = page.getByRole("heading", { level: 1 });
  const particleText = heading.locator("[data-hero-particle-text]");

  await expect(heading).toHaveAccessibleName("Berat Ercevik");
  await expect(particleText).toHaveAttribute(
    "data-particle-text-mode",
    "enhanced",
  );
  await expect(particleText.locator('canvas[aria-hidden="true"]')).toBeVisible();
  await expect(particleText.getByText("BERAT", { exact: true })).toBeAttached();

  runtimeErrors.assertEmpty();
});

test("keeps Particle Text enhanced after switching themes", async ({ page }) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  const particleText = page.locator("[data-hero-particle-text]");
  await expect(particleText).toHaveAttribute(
    "data-particle-text-mode",
    "enhanced",
  );

  await page
    .getByRole("button", { name: /Switch to (light|dark) theme/ })
    .click();

  await expect(particleText).toHaveAttribute(
    "data-particle-text-mode",
    "enhanced",
  );
  await expect(particleText.locator('canvas[aria-hidden="true"]')).toBeVisible();

  runtimeErrors.assertEmpty();
});

test("uses a static BERAT fallback when reduced motion is requested", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  const particleText = page.locator("[data-hero-particle-text]");
  await expect(particleText).toHaveAttribute(
    "data-particle-text-mode",
    "static",
  );
  await expect(particleText.getByText("BERAT", { exact: true })).toBeVisible();
  await expect(particleText.locator("canvas")).toHaveCount(0);

  runtimeErrors.assertEmpty();
  await context.close();
});

test("updates the static BERAT color when the accent palette changes", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await page.goto("/");

  const particleText = page.locator("[data-hero-particle-text]");
  const berat = particleText.getByText("BERAT", { exact: true });
  await expect(berat).toHaveCSS(
    "color",
    "color(srgb 0.00941176 0.523922 0.628235)",
  );

  await page.getByRole("button", { name: /Color theme:/ }).click();
  await page.getByRole("button", { name: /Orchid color theme/ }).click();

  await expect(berat).toHaveCSS(
    "color",
    "color(srgb 0.404706 0.215686 0.609412)",
  );
  await context.close();
});

test("darkens BERAT in light mode and lightens it in dark mode", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const readBeratColor = async (theme: "light" | "dark") => {
    const page = await context.newPage();
    await page.addInitScript(
      (value) => localStorage.setItem("theme", value),
      theme,
    );
    await page.goto("/");
    const color = await page
      .locator("[data-hero-particle-text]")
      .getByText("BERAT", { exact: true })
      .evaluate((element) => getComputedStyle(element).color);
    await page.close();
    return color;
  };

  const lightModeColor = await readBeratColor("light");
  const darkModeColor = await readBeratColor("dark");

  expect(lightModeColor).toBe("color(srgb 0.00941176 0.523922 0.628235)");
  expect(darkModeColor).toBe("color(srgb 0.359216 0.878431 0.978039)");
  await context.close();
});
