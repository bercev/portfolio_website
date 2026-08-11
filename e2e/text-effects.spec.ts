import { expect, test } from "@playwright/test";

test("keeps animated text and links semantically stable", async ({ page }) => {
  await page.goto("/");

  const showcase = page.getByRole("region", { name: "Text effect semantics" });
  await expect(showcase).toBeAttached();
  await expect(showcase.getByText("Berat", { exact: true })).toBeAttached();
  await expect(
    showcase.locator(".sr-only", {
      hasText: /^I build software that reasons, adapts, and ships\.$/,
    }),
  ).toBeAttached();
  await expect(
    showcase.locator(".sr-only", { hasText: /^About$/ }),
  ).toBeAttached();

  const external = showcase.getByRole("link", { name: /GitHub/i });
  await expect(external).toHaveAttribute("target", "_blank");
  await expect(external).toHaveAttribute("rel", /noopener/);
  await expect(external).toHaveAttribute("rel", /noreferrer/);
});

test("keeps the first trait static for reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();

  await page.goto("/");

  const showcase = page.getByRole("region", { name: "Text effect semantics" });
  await expect(showcase.getByText("Curious", { exact: true })).toBeAttached();

  await context.close();
});
