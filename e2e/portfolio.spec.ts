import { expect, test } from "@playwright/test";

const navigationItems = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "publications", label: "Publications" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
] as const;

test("renders the approved portfolio structure in semantic order", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Berat Ercevik",
  );

  const sectionIds = await page.locator("main > section").evaluateAll((sections) =>
    sections.map((section) => section.id),
  );
  expect(sectionIds).toEqual(navigationItems.map(({ id }) => id));
});

test("renders exact publications and their canonical destinations", async ({
  page,
}) => {
  await page.goto("/");

  const papers = [
    {
      title:
        "SkillOptimizer: Agent Skill Optimization Through Subskills Without Task Supervision.",
      href: "https://openreview.net/forum?id=nZYF0aPAMP",
    },
    {
      title: "@GrokSet: Multi-party Human-LLM Interactions in Social Media.",
      href: "https://arxiv.org/abs/2602.21236",
    },
  ] as const;

  for (const paper of papers) {
    await expect(
      page.getByRole("link", { name: new RegExp(paper.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }),
    ).toHaveAttribute("href", paper.href);
  }
});

test("renders every approved role, project, and skill category", async ({
  page,
}) => {
  await page.goto("/");

  for (const role of [
    "AI Systems Engineer Intern",
    "DSA Tutor",
    "LLM Researcher",
    "SWE Intern",
  ]) {
    await expect(page.getByRole("heading", { name: role, exact: true })).toBeVisible();
  }

  for (const project of ["Vitae", "AI Discord Chatbot"]) {
    await expect(
      page.getByRole("heading", { name: project, exact: true }),
    ).toBeVisible();
  }

  for (const category of ["Languages", "Tools", "Frameworks", "Knowledge"]) {
    await expect(
      page.getByRole("heading", { name: category, exact: true }),
    ).toBeVisible();
  }
});

test("exposes approved profile links without an email link", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('a[href="https://github.com/bercev"]:visible')).not.toHaveCount(0);
  await expect(
    page.locator('a[href="https://linkedin.com/in/berat-ercevik"]:visible'),
  ).not.toHaveCount(0);
  await expect(page.locator('a[href="/resume.pdf"]:visible')).not.toHaveCount(0);
  await expect(page.locator('a[href^="mailto:"]:visible')).toHaveCount(0);
});

test("keeps the hero heading and profile actions in the initial viewport", async ({
  browser,
}) => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport,
      hasTouch: viewport.width === 390,
      isMobile: viewport.width === 390,
    });
    const page = await context.newPage();
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport({
      ratio: 1,
    });
    for (const label of ["GitHub", "LinkedIn", "Resume"]) {
      await expect(
        page.locator("#home").getByRole("link", { name: new RegExp(`^${label}`) }),
      ).toBeInViewport({ ratio: 1 });
    }

    await context.close();
  }
});

test("keeps the skills marquee static in a narrow fine-pointer viewport", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/");

  await expect(page.locator("[data-effect-mode]")).toHaveAttribute(
    "data-effect-mode",
    "mobile",
  );

  const tracks = page.locator("#skills [data-skills-track]");
  await expect(tracks).toHaveCount(2);
  for (const track of await tracks.all()) {
    await expect(track).toHaveCSS("animation-name", "none");
    await expect(track).toHaveCSS("transform", "none");
  }

  await context.close();
});

test("moves enhanced desktop skill rows in opposite directions", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("[data-effect-mode]")).toHaveAttribute(
    "data-effect-mode",
    "enhanced",
  );
  await expect(page.locator('[data-skills-marquee="enhanced"]')).toHaveCount(1);

  const tracks = page.locator("#skills [data-skills-track]");
  await expect(tracks).toHaveCount(2);
  await expect(tracks.nth(0)).toHaveCSS("animation-name", "skills-marquee");
  await expect(tracks.nth(0)).toHaveCSS("animation-direction", "normal");
  await expect(tracks.nth(1)).toHaveCSS("animation-name", "skills-marquee");
  await expect(tracks.nth(1)).toHaveCSS("animation-direction", "reverse");
});

test("disables continuous skill movement for reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");

  await expect(page.locator('[data-skills-marquee="static"]')).toHaveCount(1);
  const tracks = page.locator("#skills [data-skills-track]");
  await expect(tracks).toHaveCount(2);
  for (const track of await tracks.all()) {
    await expect(track).toHaveCSS("animation-name", "none");
    await expect(track).toHaveCSS("transform", "none");
  }
  await expect(page.locator("#skills")).toContainText("Concurrency & Parallelism");

  await context.close();
});

test("navigation opens by click and exposes every approved section", async ({
  page,
}) => {
  await page.goto("/");

  const trigger = page.getByRole("button", {
    name: "Open section navigation",
  });

  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  for (const item of navigationItems) {
    await expect(
      page.getByRole("link", { name: item.label, exact: true }),
    ).toHaveAttribute("href", `#${item.id}`);
  }
});

test("navigation opens from the keyboard and Escape restores trigger focus", async ({
  page,
}) => {
  await page.goto("/");

  const trigger = page.getByRole("button", {
    name: "Open section navigation",
  });
  const firstLink = page.getByRole("link", { name: "Home", exact: true });

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Tab");
  await expect(firstLink).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

test("navigation anchors update the hash and bring each target into view", async ({
  page,
}) => {
  await page.goto("/");

  for (const item of navigationItems) {
    const trigger = page.getByRole("button", {
      name: "Open section navigation",
    });
    await trigger.click();

    await page.getByRole("link", { name: item.label, exact: true }).click();

    await expect(page).toHaveURL(new RegExp(`#${item.id}$`));
    await expect(page.locator(`#${item.id}`)).toBeInViewport();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  }
});

test("navigation keeps a single-column menu throughout the mobile range", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 700, height: 900 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  await page.goto("/");
  await page
    .getByRole("button", { name: "Open section navigation" })
    .tap();

  const homeBox = await page
    .getByRole("link", { name: "Home", exact: true })
    .boundingBox();
  const aboutBox = await page
    .getByRole("link", { name: "About", exact: true })
    .boundingBox();

  expect(homeBox).not.toBeNull();
  expect(aboutBox).not.toBeNull();
  expect(Math.abs(homeBox!.x - aboutBox!.x)).toBeLessThan(1);
  expect(aboutBox!.y).toBeGreaterThanOrEqual(homeBox!.y + homeBox!.height);

  await context.close();
});

test("navigation remains operable in a touch-sized viewport", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  await page.goto("/");

  const trigger = page.getByRole("button", {
    name: "Open section navigation",
  });
  await trigger.tap();

  const navigation = page.getByRole("navigation", {
    name: "Section navigation",
  });
  await expect(navigation).toBeVisible();
  await expect(page.getByRole("link", { name: "Contact", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "About", exact: true }).tap();
  await expect(page).toHaveURL(/#about$/);
  await expect(page.locator("#about")).toBeInViewport();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await context.close();
});
