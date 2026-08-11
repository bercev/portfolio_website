import { expect, test } from "@playwright/test";

test("resolves the system theme on the document", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveClass(/light|dark/);
});

test("shows the theme toggle in the site header", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("button", { name: /Switch to (light|dark) theme/ }),
  ).toBeVisible();
});
