import { test, expect } from "@playwright/test";

test("page loads with all sections", async ({ page }) => {
  await page.goto("/");
  for (const id of ["home", "about", "experience", "projects", "publications", "resume", "contact"]) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await expect(page.getByText("Berat", { exact: true }).first()).toBeVisible();
});

test("no horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
});

test("theme toggle flips and persists", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const before = (await html.getAttribute("class")) ?? "";
  await page.getByRole("button", { name: /switch to (dark|light) mode/i }).click();
  const after = (await html.getAttribute("class")) ?? "";
  expect(after).not.toBe(before);
  await page.reload();
  const persisted = (await html.getAttribute("class")) ?? "";
  expect(persisted).toBe(after);
});

test("resume section has iframe and download button", async ({ page }) => {
  await page.goto("/");
  await page.locator("#resume").scrollIntoViewIfNeeded();
  await expect(page.locator("#resume iframe")).toBeVisible();
  await expect(page.locator("#resume").getByRole("button", { name: /download resume/i })).toBeVisible();
});

test("no console errors on load", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/");
  await page.waitForTimeout(1500);
  const real = errors.filter((e) => !e.includes("TubesCursor failed to load"));
  expect(real).toEqual([]);
});
