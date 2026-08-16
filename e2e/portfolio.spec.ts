import {
  attachRuntimeErrorCollector,
  expect,
  test,
} from "./runtime-errors";

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

test("uses editorial education and publication structures", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("[data-education-panel]")).toHaveCount(1);
  await expect(page.locator("[data-publication-row]")).toHaveCount(2);
  await expect(page.locator("[data-publication-index]")).toHaveCount(0);
  await expect(page.locator("#about [data-portfolio-card]")).toHaveCount(0);
  await expect(page.locator("#publications [data-portfolio-card]")).toHaveCount(0);
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

test("uses a divided chronology and two chromatic project cards", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("#experience [data-portfolio-card]")).toHaveCount(0);
  await expect(page.locator("#projects [data-portfolio-card]")).toHaveCount(2);
  await expect(page.locator("#projects [data-chroma-card]")).toHaveCount(2);
  await expect(page.locator("#experience [data-experience-row]")).toHaveCount(4);
  await expect(page.locator("#projects [data-project-featured]")).toHaveCount(1);
  await expect(page.locator("#projects [data-project-supporting]")).toHaveCount(1);
  await expect(page.locator("main [data-portfolio-card]")).toHaveCount(2);
  await expect(page.locator("#skills [data-skills-marquee]")).toHaveCount(1);
  await expect(page.locator('#projects a[href="https://vitae.tools/"]')).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "AI Discord Chatbot", exact: true }),
  ).not.toHaveRole("link");

  const cards = await page.locator("#projects [data-portfolio-card]").all();
  const [featuredBox, supportingBox] = await Promise.all(
    cards.map((card) => card.boundingBox()),
  );
  expect(featuredBox).not.toBeNull();
  expect(supportingBox).not.toBeNull();
  expect(featuredBox!.width).toBeGreaterThan(supportingBox!.width);
});

test("keeps icon-led profile actions only in the site header", async ({
  page,
}) => {
  await page.goto("/");

  const header = page.locator("header");
  const contact = page.locator("#contact");
  for (const href of [
    "https://github.com/bercev",
    "https://linkedin.com/in/berat-ercevik",
    "/resume.pdf",
  ]) {
    const action = header.locator(`a[href=${JSON.stringify(href)}]`);
    await expect(action).toHaveCount(1);
    await expect(action.locator("svg")).toHaveCount(1);
    await expect(contact.locator(`a[href=${JSON.stringify(href)}]`)).toHaveCount(
      0,
    );
  }
  await expect(page.locator('main > section:not(#contact) a[href="https://github.com/bercev"]')).toHaveCount(0);
  await expect(page.locator('main > section:not(#contact) a[href="https://linkedin.com/in/berat-ercevik"]')).toHaveCount(0);
  await expect(page.locator('main > section:not(#contact) a[href="/resume.pdf"]')).toHaveCount(0);
  await expect(page.locator('a[href^="mailto:"]:visible')).toHaveCount(0);
});

test("resume download fires the Magic UI confetti canvas", async ({ page }) => {
  await page.goto("/");

  const resume = page.locator('header a[href="/resume.pdf"]');
  const canvas = page.locator("canvas[data-confetti-canvas]");
  await expect(canvas).toHaveCount(1);

  const download = page.waitForEvent("download");
  await resume.click();
  expect((await download).suggestedFilename()).toBe("resume.pdf");

  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const target = element as HTMLCanvasElement;
        const context = target.getContext("2d");
        if (!context || target.width === 0 || target.height === 0) return false;
        return context
          .getImageData(0, 0, target.width, target.height)
          .data.some((channel, index) => index % 4 === 3 && channel > 0);
      }),
    )
    .toBe(true);
});

test("keeps navigation contrast and typography intentional in both themes", async ({
  browser,
}) => {
  for (const colorScheme of ["light", "dark"] as const) {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    const runtimeErrors = attachRuntimeErrorCollector(page);
    await page.goto("/");

    const action = page.locator("[data-bubble-menu-trigger]");
    const styles = await action.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
      };
    });

    expect(styles.color).not.toBe(styles.backgroundColor);
    expect(
      await page
        .locator("body")
        .evaluate((element) => getComputedStyle(element).fontFamily),
    ).toContain("Archivo");

    runtimeErrors.assertEmpty();
    await context.close();
  }
});

test("keeps the hero focused on the identity without a project action", async ({
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
    const runtimeErrors = attachRuntimeErrorCollector(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport({
      ratio: 1,
    });
    await expect(
      page.locator("#home").getByRole("link", { name: "View projects" }),
    ).toHaveCount(0);
    await expect(page.locator('#home a[href^="https://"]')).toHaveCount(0);
    await expect(page.locator('#home a[href="/resume.pdf"]')).toHaveCount(0);

    runtimeErrors.assertEmpty();
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
  const runtimeErrors = attachRuntimeErrorCollector(page);
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

  runtimeErrors.assertEmpty();
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
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  await expect(page.locator('[data-skills-marquee="static"]')).toHaveCount(1);
  const tracks = page.locator("#skills [data-skills-track]");
  await expect(tracks).toHaveCount(2);
  for (const track of await tracks.all()) {
    await expect(track).toHaveCSS("animation-name", "none");
    await expect(track).toHaveCSS("transform", "none");
  }
  await expect(page.locator("#skills")).toContainText("Concurrency & Parallelism");

  runtimeErrors.assertEmpty();
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

  const bubbleItems = page.locator("[data-bubble-menu-item]");
  await expect(bubbleItems).toHaveCount(navigationItems.length);

  for (const item of navigationItems) {
    await expect(
      page.getByRole("link", { name: item.label, exact: true }),
    ).toHaveAttribute("href", `#${item.id}`);
  }
});

test("navigation blooms locally around its bottom-center trigger", async ({
  page,
}) => {
  await page.goto("/");

  const viewport = page.viewportSize();
  const trigger = page.getByRole("button", {
    name: "Open section navigation",
  });
  const triggerBox = await trigger.boundingBox();

  expect(viewport).not.toBeNull();
  expect(triggerBox).not.toBeNull();
  expect(triggerBox!.x + triggerBox!.width / 2).toBeCloseTo(
    viewport!.width / 2,
    0,
  );

  await trigger.click();

  const triggerCenter = {
    x: triggerBox!.x + triggerBox!.width / 2,
    y: triggerBox!.y + triggerBox!.height / 2,
  };
  const bubbleBoxes = await page.locator("[data-bubble-menu-item]").evaluateAll(
    (elements) =>
      elements.map((element) => {
        const { height, width, x, y } = element.getBoundingClientRect();
        return { height, width, x, y };
      }),
  );

  expect(bubbleBoxes).toHaveLength(navigationItems.length);
  for (const bubble of bubbleBoxes) {
    const bubbleCenter = {
      x: bubble.x + bubble.width / 2,
      y: bubble.y + bubble.height / 2,
    };
    expect(Math.hypot(
      bubbleCenter.x - triggerCenter.x,
      bubbleCenter.y - triggerCenter.y,
    )).toBeLessThan(250);
  }

  const menuBounds = await page
    .locator("#section-navigation-links")
    .boundingBox();
  expect(menuBounds).not.toBeNull();
  expect(menuBounds!.width).toBeLessThan(viewport!.width * 0.75);
  expect(menuBounds!.height).toBeLessThan(viewport!.height * 0.55);
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

test("navigation keeps a compact local cloud throughout the mobile range", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 700, height: 900 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.goto("/");
  await page
    .getByRole("button", { name: "Open section navigation" })
    .tap();

  const triggerBox = await page
    .getByRole("button", { name: "Open section navigation" })
    .boundingBox();
  const bubbleBoxes = await page.locator("[data-bubble-menu-item]").evaluateAll(
    (elements) =>
      elements.map((element) => {
        const { height, width, x, y } = element.getBoundingClientRect();
        return { height, width, x, y };
      }),
  );

  expect(triggerBox).not.toBeNull();
  expect(bubbleBoxes).toHaveLength(navigationItems.length);
  for (const bubble of bubbleBoxes) {
    expect(bubble.x).toBeGreaterThanOrEqual(16);
    expect(bubble.x + bubble.width).toBeLessThanOrEqual(684);
    expect(bubble.y + bubble.height).toBeLessThan(triggerBox!.y);
  }

  runtimeErrors.assertEmpty();
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
  const runtimeErrors = attachRuntimeErrorCollector(page);

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

  runtimeErrors.assertEmpty();
  await context.close();
});

test("keeps every canonical destination exact and serves the local resume as PDF", async ({
  page,
}) => {
  await page.goto("/");

  const canonicalDestinations = [
    "https://github.com/bercev",
    "https://linkedin.com/in/berat-ercevik",
    "/resume.pdf",
    "https://openreview.net/forum?id=nZYF0aPAMP",
    "https://arxiv.org/abs/2602.21236",
    "https://vitae.tools/",
  ] as const;

  for (const href of canonicalDestinations) {
    const links = page.locator(`a[href=${JSON.stringify(href)}]`);
    expect(await links.count(), `${href} should be linked`).toBeGreaterThan(0);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /(^|\s)noopener(\s|$)/);
      await expect(link).toHaveAttribute("rel", /(^|\s)noreferrer(\s|$)/);
    }
  }

  const resumeResponse = await page.request.get("/resume.pdf", {
    failOnStatusCode: false,
  });
  expect(resumeResponse.status()).toBe(200);
  expect(resumeResponse.headers()["content-type"]).toMatch(
    /^application\/pdf(?:;|$)/,
  );
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
});

test("supports a visible keyboard path through chrome, external links, and Bubble Menu", async ({
  page,
}) => {
  await page.goto("/");

  const expectVisibleFocus = async (locator: ReturnType<typeof page.locator>) => {
    await expect(locator).toBeFocused();
    expect(
      await locator.evaluate((element) => {
        const styles = window.getComputedStyle(element);
        return (
          element.matches(":focus-visible") &&
          styles.outlineStyle !== "none" &&
          Number.parseFloat(styles.outlineWidth) >= 2
        );
      }),
    ).toBe(true);
  };

  await page.keyboard.press("Tab");
  await expectVisibleFocus(
    page.getByRole("link", { name: "Berat Ercevik, home" }),
  );

  for (const href of [
    "https://github.com/bercev",
    "https://linkedin.com/in/berat-ercevik",
    "/resume.pdf",
  ] as const) {
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expectVisibleFocus(focused);
    await expect(focused).toHaveAttribute("href", href);
  }

  await page.keyboard.press("Tab");
  const themeToggle = page.getByRole("button", {
    name: /Switch to (light|dark) theme/,
  });
  await expectVisibleFocus(themeToggle);
  await expect(themeToggle).toHaveAccessibleName(/Switch to (light|dark) theme/);

  const expectedContentHrefs = [
    "https://openreview.net/forum?id=nZYF0aPAMP",
    "https://arxiv.org/abs/2602.21236",
    "https://vitae.tools/",
  ] as const;

  for (const href of expectedContentHrefs) {
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expectVisibleFocus(focused);
    await expect(focused).toHaveAttribute("href", href);
  }

  const skillRows = page.locator("[data-skills-row]");
  await expect(skillRows).toHaveCount(2);
  for (const skillRow of await skillRows.all()) {
    await page.keyboard.press("Tab");
    await expectVisibleFocus(skillRow);
  }

  await page.keyboard.press("Tab");
  const menuTrigger = page.getByRole("button", {
    name: "Open section navigation",
  });
  await expectVisibleFocus(menuTrigger);
  await expect(menuTrigger).toHaveAccessibleName("Open section navigation");
  await page.keyboard.press("Enter");

  for (const item of navigationItems) {
    await page.keyboard.press("Tab");
    const sectionLink = page.getByRole("link", {
      name: item.label,
      exact: true,
    });
    await expectVisibleFocus(sectionLink);
    await expect(sectionLink).toHaveAttribute("href", `#${item.id}`);
  }
});

test("keeps document semantics stable and hides decorative canvases", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Berat Ercevik",
  );

  const headingLabels = [
    "About",
    "Publications",
    "Experience",
    "Projects",
    "Skills",
  ] as const;
  for (const label of headingLabels) {
    await expect(
      page.getByRole("heading", { level: 2, name: label, exact: true }),
    ).toHaveCount(1);
  }

  await expect(page.locator("#home a")).toHaveCount(0);
  await expect(page.locator("[data-effect-mode]")).toHaveAttribute(
    "data-effect-mode",
    "enhanced",
  );

  const canvases = page.locator("canvas");
  expect(await canvases.count()).toBeGreaterThanOrEqual(3);
  for (const canvas of await canvases.all()) {
    expect(
      await canvas.evaluate(
        (element) => element.closest('[aria-hidden="true"]') !== null,
      ),
    ).toBe(true);
  }

  await page.waitForTimeout(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Berat Ercevik",
  );
  for (const label of headingLabels) {
    await expect(
      page.getByRole("heading", { level: 2, name: label, exact: true }),
    ).toHaveCount(1);
  }
});
