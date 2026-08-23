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
  expect(sectionIds).toEqual(
    navigationItems.filter(({ id }) => id !== "skills").map(({ id }) => id),
  );
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

test("renders publication link icons at a legible size", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const icons = page.locator("#publications h3 a > svg");
  await expect(icons).toHaveCount(2);

  const iconSizes = await icons.evaluateAll((elements) =>
    elements.map((element) => {
      const { height, width } = element.getBoundingClientRect();
      return { height, width };
    }),
  );
  for (const icon of iconSizes) {
    expect(icon.width).toBeGreaterThanOrEqual(24);
    expect(icon.height).toBeGreaterThanOrEqual(24);
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

  await expect(page.locator("#projects [data-circular-gallery]")).toHaveCount(0);
});

test("uses monochrome ChromaCard borders in both themes", async ({ browser }) => {
  for (const theme of ["light", "dark"] as const) {
    const context = await browser.newContext({
      colorScheme: theme,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const runtimeErrors = attachRuntimeErrorCollector(page);
    await page.addInitScript((storedTheme) => {
      localStorage.setItem("theme", storedTheme);
    }, theme);
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(
      new RegExp(`(^|\\s)${theme}(\\s|$)`),
    );

    const cards = page.locator("[data-chroma-card]");
    await expect(cards).toHaveCount(2);
    for (const card of await cards.all()) {
      await expect(card).toHaveCSS("background-image", "none");
      await expect(card).toHaveCSS("border-top-width", "1px");
      await expect(card).toHaveCSS(
        "border-top-color",
        theme === "dark" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)",
      );
    }

    runtimeErrors.assertEmpty();
    await context.close();
  }
});

test("gives ChromaCards a frosted glass surface", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const surface = page.locator("[data-chroma-surface]").first();
  await expect(
    page.locator("[data-chroma-glow], [data-chroma-sweep]"),
  ).toHaveCount(0);
  const styles = await surface.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      backdropFilter: computed.backdropFilter,
      boxShadow: computed.boxShadow,
    };
  });

  expect(styles.backdropFilter).toContain("blur(18px)");
  expect(styles.boxShadow).not.toBe("none");
});

test("renders the line sidebar as section navigation", async ({ page }) => {
  await page.goto("/");

  const sidebar = page.getByRole("navigation", { name: "Section navigation" }).last();
  await expect(sidebar).toHaveAttribute("data-line-sidebar");
  await expect(sidebar.locator("a")).toHaveCount(6);
  await expect(sidebar.locator("a").first()).toHaveAttribute("href", "#home");
  await expect(sidebar.locator("a").last()).toHaveAttribute("href", "#contact");
  await expect(sidebar.locator("[data-line-sidebar-marker]")).toHaveCount(7);
});

test("tracks the visible section with the active palette color", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("theme-palette", "rose");
  });
  await page.goto("/");

  const sidebar = page.getByRole("navigation", {
    name: "Line section navigation",
  });
  const projectsLink = sidebar.getByRole("link", {
    name: /Projects/,
  });

  await page.locator("#projects").evaluate((section) => {
    section.scrollIntoView({ block: "start" });
  });
  await expect(projectsLink).toHaveAttribute("aria-current", "location");

  const colors = await projectsLink.evaluate((element) => ({
    accent: getComputedStyle(document.documentElement)
      .getPropertyValue("--portfolio-accent")
      .trim(),
    link: getComputedStyle(element).color,
  }));
  expect(colors.link).toBe("rgb(244, 63, 94)");
  expect(colors.accent).toBe("#f43f5e");
});

test("uses the display-mode accent for active navigation without a palette", async ({
  browser,
}) => {
  for (const theme of ["light", "dark"] as const) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.addInitScript((storedTheme) => {
      localStorage.setItem("theme", storedTheme);
      localStorage.setItem("theme-palette", "none");
    }, theme);
    await page.goto("/");

    const sidebar = page.getByRole("navigation", {
      name: "Line section navigation",
    });
    const activeLink = sidebar.getByRole("link", { name: /Home/ });
    const activeIndex = activeLink.locator("span").first();
    await expect(activeLink).toHaveAttribute("aria-current", "location");

    const expectedColor =
      theme === "dark" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)";
    await expect(activeLink).toHaveCSS("color", expectedColor);
    await expect(activeIndex).toHaveCSS("color", expectedColor);
    await expect(
      activeLink.locator("..").locator("[data-line-sidebar-marker]"),
    ).toHaveCSS("background-color", expectedColor);

    await context.close();
  }
});

test("keeps line navigation labels and markers comfortably legible", async ({
  page,
}) => {
  await page.goto("/");

  const sidebar = page.getByRole("navigation", {
    name: "Line section navigation",
  });
  const homeLink = sidebar.getByRole("link", { name: /Home/ });
  const index = homeLink.locator("span").first();
  const marker = homeLink.locator("..").locator("[data-line-sidebar-marker]");

  expect(
    Number.parseFloat(
      await homeLink.evaluate((node) => getComputedStyle(node).fontSize),
    ),
  ).toBeGreaterThanOrEqual(12);
  expect(
    Number.parseFloat(
      await index.evaluate((node) => getComputedStyle(node).fontSize),
    ),
  ).toBeGreaterThanOrEqual(10);

  const markerBox = await marker.boundingBox();
  expect(markerBox).not.toBeNull();
  expect(markerBox!.width).toBeGreaterThanOrEqual(64);
  expect(markerBox!.height).toBeGreaterThanOrEqual(2);
});

test("keeps profile actions only in the utility menu", async ({
  page,
}) => {
  await page.goto("/");

  const header = page.locator("header");
  const contact = page.locator("#contact");
  await page.getByRole("button", { name: "Open utility menu" }).click();
  const menu = page.getByRole("navigation", { name: "Utility menu" });

  for (const href of [
    "https://github.com/bercev",
    "https://linkedin.com/in/berat-ercevik",
    "/assets/documents/resume.pdf",
  ]) {
    const action = menu.locator(`a[href=${JSON.stringify(href)}]`);
    await expect(action).toHaveCount(1);
    await expect(action.locator("svg")).toHaveCount(1);
    await expect(header.locator(`a[href=${JSON.stringify(href)}]`)).toHaveCount(
      0,
    );
    await expect(contact.locator(`a[href=${JSON.stringify(href)}]`)).toHaveCount(
      0,
    );
  }
  await expect(page.locator('main > section:not(#contact) a[href="https://github.com/bercev"]')).toHaveCount(0);
  await expect(page.locator('main > section:not(#contact) a[href="https://linkedin.com/in/berat-ercevik"]')).toHaveCount(0);
  await expect(page.locator('main > section:not(#contact) a[href="/assets/documents/resume.pdf"]')).toHaveCount(0);
  await expect(page.locator('a[href^="mailto:"]:visible')).toHaveCount(0);
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
    await expect(page.locator('#home a[href="/assets/documents/resume.pdf"]')).toHaveCount(0);

    runtimeErrors.assertEmpty();
    await context.close();
  }
});

test("places the skills marquee inside the hero without a large heading", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const hero = page.locator("#home");
  const particleText = hero.locator("[data-hero-particle-text]");
  const skills = hero.locator(":scope > div > #skills");

  await expect(skills).toHaveCount(1);
  await expect(skills.locator("[data-skills-marquee]")).toHaveCount(1);
  await expect(skills.getByRole("heading", { level: 2 })).toHaveCount(0);
  await expect(page.locator("main > #skills")).toHaveCount(0);

  const [particleBox, skillsBox] = await Promise.all([
    particleText.boundingBox(),
    skills.boundingBox(),
  ]);
  expect(particleBox).not.toBeNull();
  expect(skillsBox).not.toBeNull();
  expect(skillsBox!.y).toBeGreaterThanOrEqual(
    particleBox!.y + particleBox!.height - 1,
  );
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

test("moves the compact skill-chip rows in opposite directions", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("[data-effect-mode]")).toHaveAttribute(
    "data-effect-mode",
    "enhanced",
  );
  await expect(page.locator('[data-skills-marquee="enhanced"]')).toHaveCount(1);

  const tracks = page.locator("#skills [data-skills-track]");
  const rows = page.locator("#skills [data-skills-row]");
  await expect(tracks).toHaveCount(2);
  await expect(rows.first()).toHaveCSS("mask-image", /linear-gradient/);
  await expect(page.locator("#skills [data-skill]").first()).toBeVisible();
  await expect(page.locator("#skills .curved-loop-svg")).toHaveCount(0);
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

test("utility menu opens by click and exposes profile and theme actions", async ({
  page,
}) => {
  await page.goto("/");

  const trigger = page.getByRole("button", {
    name: "Open utility menu",
  });

  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  const bubbleItems = page.locator("[data-bubble-menu-item]");
  await expect(bubbleItems).toHaveCount(5);
  await expect(page.getByRole("link", { name: "GitHub" })).toBeVisible();
  await expect(page.getByRole("link", { name: "LinkedIn" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Resume" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Switch to (light|dark) theme/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Color theme:/ })).toBeVisible();
});

test("navigation stays open inside its hover-safe area and closes outside it", async ({
  page,
}) => {
  await page.goto("/");

  const trigger = page.getByRole("button", {
    name: "Open utility menu",
  });

  await trigger.hover();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  const safeArea = page.locator("[data-bubble-menu-safe-area]");
  const safeAreaBox = await safeArea.boundingBox();
  expect(safeAreaBox).not.toBeNull();

  await page.mouse.move(
    safeAreaBox!.x + safeAreaBox!.width / 2,
    safeAreaBox!.y + safeAreaBox!.height / 2,
  );
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  await page.mouse.move(0, 0);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("navigation stays open along a slow diagonal path to an outer bubble", async ({
  page,
}) => {
  await page.goto("/");

  const trigger = page.getByRole("button", {
    name: "Open utility menu",
  });
  await trigger.hover();

  const outerBubble = page.getByRole("link", { name: "GitHub", exact: true });
  const triggerBox = await trigger.boundingBox();
  const bubbleBox = await outerBubble.boundingBox();
  expect(triggerBox).not.toBeNull();
  expect(bubbleBox).not.toBeNull();

  const start = {
    x: triggerBox!.x + triggerBox!.width / 2,
    y: triggerBox!.y + triggerBox!.height / 2,
  };
  const end = {
    x: bubbleBox!.x + bubbleBox!.width / 2,
    y: bubbleBox!.y + bubbleBox!.height / 2,
  };

  for (let step = 1; step <= 30; step += 1) {
    const progress = step / 30;
    await page.mouse.move(
      start.x + (end.x - start.x) * progress,
      start.y + (end.y - start.y) * progress,
    );
    await page.waitForTimeout(12);
  }

  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(outerBubble).toBeVisible();
});

test("navigation blooms locally around its bottom-center trigger", async ({
  page,
}) => {
  await page.goto("/");

  const viewport = page.viewportSize();
  const trigger = page.getByRole("button", {
    name: "Open utility menu",
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

  expect(bubbleBoxes).toHaveLength(5);
  for (const bubble of bubbleBoxes) {
    const bubbleCenter = {
      x: bubble.x + bubble.width / 2,
      y: bubble.y + bubble.height / 2,
    };
    expect(Math.hypot(
      bubbleCenter.x - triggerCenter.x,
      bubbleCenter.y - triggerCenter.y,
    )).toBeLessThan(185);
  }

  const menuBounds = await page
    .locator("#utility-menu-items")
    .boundingBox();
  expect(menuBounds).not.toBeNull();
  expect(menuBounds!.width).toBeLessThan(viewport!.width * 0.75);
  expect(menuBounds!.height).toBeLessThan(viewport!.height * 0.3);
});

test("navigation opens from the keyboard and Escape restores trigger focus", async ({
  page,
}) => {
  await page.goto("/");

  const trigger = page.getByRole("button", {
    name: "Open utility menu",
  });
  const firstLink = page.getByRole("link", { name: "GitHub", exact: true });

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Tab");
  await expect(firstLink).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

test("utility menu keeps a compact local cloud throughout the mobile range", async ({
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
    .getByRole("button", { name: "Open utility menu" })
    .tap();

  const triggerBox = await page
    .getByRole("button", { name: "Open utility menu" })
    .boundingBox();
  const bubbleBoxes = await page.locator("[data-bubble-menu-item]").evaluateAll(
    (elements) =>
      elements.map((element) => {
        const { height, width, x, y } = element.getBoundingClientRect();
        return { height, width, x, y };
      }),
  );

  expect(triggerBox).not.toBeNull();
  expect(bubbleBoxes).toHaveLength(5);
  for (const bubble of bubbleBoxes) {
    expect(bubble.x).toBeGreaterThanOrEqual(16);
    expect(bubble.x + bubble.width).toBeLessThanOrEqual(684);
    expect(bubble.y + bubble.height).toBeLessThan(triggerBox!.y);
  }

  runtimeErrors.assertEmpty();
  await context.close();
});

test("utility menu remains operable in a touch-sized viewport", async ({
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
    name: "Open utility menu",
  });
  await trigger.tap();

  const navigation = page.getByRole("navigation", {
    name: "Utility menu",
  });
  await expect(navigation).toBeVisible();
  await expect(page.getByRole("link", { name: "GitHub", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Switch to (light|dark) theme/ }).tap();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

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
    "/assets/documents/resume.pdf",
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

  const resumeResponse = await page.request.get("/assets/documents/resume.pdf", {
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
    name: "Open utility menu",
  });
  await expectVisibleFocus(menuTrigger);
  await expect(menuTrigger).toHaveAccessibleName("Open utility menu");
  await page.keyboard.press("Enter");

  for (const href of [
    "https://github.com/bercev",
    "https://linkedin.com/in/berat-ercevik",
    "/assets/documents/resume.pdf",
  ] as const) {
    await page.keyboard.press("Tab");
    const utilityLink = page.locator(":focus");
    await expectVisibleFocus(utilityLink);
    await expect(utilityLink).toHaveAttribute("href", href);
  }

  await page.keyboard.press("Tab");
  await expectVisibleFocus(page.getByRole("button", { name: /Switch to (light|dark) theme/ }));
  await page.keyboard.press("Tab");
  await expectVisibleFocus(page.getByRole("button", { name: /Color theme:/ }));
});

test("keeps document semantics stable and hides decorative canvases", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("[data-feedback-toolbar]")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Berat Ercevik",
  );

  const headingLabels = [
    "About",
    "Publications",
    "Experience",
    "Projects",
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
