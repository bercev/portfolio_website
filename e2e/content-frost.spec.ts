import { expect, test } from "./runtime-errors";

test("starts the shared frost when the BERAT text leaves view", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const frost = page.locator("[data-content-frost]");
  await expect(frost).toHaveCount(1);
  await expect(frost).toHaveCSS("opacity", "0");

  const frostStyles = await frost.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      backdropFilter: computed.backdropFilter,
      backgroundColor: computed.backgroundColor,
      pointerEvents: computed.pointerEvents,
    };
  });
  expect(frostStyles.backdropFilter).toContain("blur(");
  expect(frostStyles.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(frostStyles.pointerEvents).toBe("none");

  const hero = page.locator("#home");
  await hero.evaluate((element) => {
    const { bottom } = element.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + bottom + 1 });
  });

  const heroBottom = await hero.evaluate(
    (element) => element.getBoundingClientRect().bottom,
  );
  expect(heroBottom).toBeLessThanOrEqual(0);
  await expect(frost).toHaveCSS("opacity", "1");

  await page.locator("#home").scrollIntoViewIfNeeded();
  await expect(frost).toHaveCSS("opacity", "0");
});
