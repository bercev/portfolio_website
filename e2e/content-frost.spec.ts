import { expect, test } from "./runtime-errors";

test("fades the shared frost in after the hero and out on return", async ({
  page,
}) => {
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

  await page.locator("#about").scrollIntoViewIfNeeded();
  await expect(frost).toHaveCSS("opacity", "1");

  await page.locator("#home").scrollIntoViewIfNeeded();
  await expect(frost).toHaveCSS("opacity", "0");
});
