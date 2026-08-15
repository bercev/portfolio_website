# Portfolio Signal Spine Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a coherent 6px rounded-rectangle system, visible high-contrast ASCII in both themes, two chroma project cards, a replayable chromatic Signal Spine, and a larger responsive editorial type scale.

**Architecture:** Keep the existing Server Component section structure and isolate motion in focused Client Components. Separate the ASCII luminance mask from visible theme colors, replace the cyan-only glow with a token-driven `ChromaCard`, evolve `ScrollProgress` into the global Signal Spine, and make `WarpText` replay on viewport re-entry without continuous React state updates.

**Tech Stack:** Next.js 16.3.0 App Router, React 19, TypeScript strict, Tailwind CSS v4, Motion 13, Three.js, Vitest, Playwright.

## Global Constraints

- Preserve section order, factual content, canonical URLs, theme persistence, semantic landmarks, Bubble Menu keyboard behavior, and Contact profile-link ownership.
- Use one 6px radius for visible rectangular containers and controls; circles are reserved for icon-only controls.
- Use chroma tokens `#00d8ff`, `#20d98b`, `#ffbf3f`, and `#ff6b57`; do not introduce violet or purple.
- Archivo remains the only visible non-ASCII typeface; Geist Mono remains exclusive to aligned ASCII output.
- Render exactly two project cards, both using the chroma effect; keep Vitae wider on desktop and stack both at mobile widths.
- Replay heading and card-entry animation when content re-enters from either scroll direction; never hide semantic content.
- Mobile keeps simplified signal and entry motion without pointer tracking or blur-heavy layers.
- Reduced motion renders deterministic static ASCII, headings, chroma borders, Signal Spine, and Skills.
- Keep all colors and shape values hand-editable in `app/globals.css`; components contain no hardcoded color literals.
- Consult the installed Next.js 16 documentation before changing application code.

---

## File Structure

- Create `components/effects/chroma-card.tsx`: spectral card edge, replayable entry sweep, fine-pointer glow, and reduced-motion fallback.
- Delete `components/effects/border-glow.tsx`: superseded cyan-only effect.
- Modify `components/ui/portfolio-card.tsx`: wrap content with `ChromaCard` and preserve `data-portfolio-card` ownership.
- Modify `components/sections/projects.tsx`: render both projects as an asymmetric pair of `PortfolioCard` instances.
- Modify `components/chrome/scroll-progress.tsx`: evolve the plain progress bar into the token-driven Signal Spine.
- Modify `components/effects/warp-text.tsx`: replay visible glyph motion on every viewport re-entry.
- Modify `components/effects/ascii-scene.ts`: use a theme-independent source-mask token.
- Modify `app/globals.css`: exact chroma tokens, 6px radius, ASCII contrast, Signal Spine styling, and responsive typography helpers.
- Modify visible controls and containers under `components/chrome`, `components/effects`, and `components/sections`: enforce the shared radius and larger type scale.
- Modify `e2e/text-effects.spec.ts`: ASCII density and replayable heading coverage.
- Modify `e2e/portfolio.spec.ts`: two chroma cards, shape ownership, and editorial type assertions.
- Modify `e2e/responsive.spec.ts`: updated two-card geometry, mobile typography, Signal Spine, reduced motion, and baselines.
- Modify `e2e/__screenshots__/chromium/*.png`: sixteen refreshed light/dark baselines after functional checks pass.
- Modify `/Users/berat/Projects/library/Projects/portfolio-website.md`: durable final state and verification counts.

---

### Task 1: Restore theme-independent ASCII density

**Files:**
- Modify: `app/globals.css`
- Modify: `components/effects/ascii-scene.ts`
- Modify: `e2e/text-effects.spec.ts`

**Interfaces:**
- Consumes: existing `AsciiScene` constructor and `imageDataToAscii` pipeline.
- Produces: `--effect-ascii-mask` CSS token and readable ASCII glyph density in light and dark.
- Preserves: `<AsciiText text={string} className?: string />` and static fallback behavior.

- [ ] **Step 1: Read the version-accurate Next.js client-component guide**

Use `nextjs_docs` for the installed project and read the returned Client Components guide before editing effect code.

- [ ] **Step 2: Add a failing light/dark ASCII density assertion**

Extend `e2e/text-effects.spec.ts`:

```ts
test("keeps the ASCII name dense and readable in both themes", async ({ browser }) => {
  for (const theme of ["light", "dark"] as const) {
    const context = await browser.newContext({ colorScheme: theme });
    const page = await context.newPage();
    await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
    await page.goto("/");

    const output = page.locator("[data-ascii-output]");
    await expect(output).not.toHaveText("");
    const density = await output.evaluate((element) => {
      const text = element.textContent ?? "";
      const cells = text.replace(/\n/g, "").length;
      return cells === 0 ? 0 : text.replace(/\s/g, "").length / cells;
    });
    expect(density).toBeGreaterThan(0.18);

    await context.close();
  }
});
```

- [ ] **Step 3: Build and run the focused test to verify RED**

Run:

```bash
npm run build
npx playwright test e2e/text-effects.spec.ts --workers=1 --grep "dense and readable"
```

Expected: FAIL in light mode because the dark foreground texture maps toward blank glyphs.

- [ ] **Step 4: Separate the ASCII source mask from visible output colors**

Add the token in `app/globals.css`:

```css
:root {
  --effect-ascii-mask: #ffffff;
  --effect-chroma-cyan: #00d8ff;
  --effect-chroma-emerald: #20d98b;
  --effect-chroma-amber: #ffbf3f;
  --effect-chroma-coral: #ff6b57;
}
```

In `AsciiScene.drawTextTexture()`, replace the foreground lookup with:

```ts
const mask = cssValue(this.root, "--effect-ascii-mask", "");
if (!mask) throw new Error("ASCII mask token is unavailable.");
// ...
this.textContext.fillStyle = mask;
```

Update the ASCII output gradient so the foreground dominates and chroma appears as restrained highlights. Use only CSS variables.

- [ ] **Step 5: Rebuild and verify focused and existing ASCII behavior**

Run:

```bash
npm run lint && npm run test && npm run build
npx playwright test e2e/text-effects.spec.ts e2e/portfolio.spec.ts --workers=1 --grep "ASCII|hero heading"
```

Expected: all selected checks pass in light, dark, mobile, and reduced motion.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css components/effects/ascii-scene.ts e2e/text-effects.spec.ts
git commit -m "fix: restore light mode ASCII contrast"
```

### Task 2: Create chroma cards and render both projects as cards

**Files:**
- Create: `components/effects/chroma-card.tsx`
- Delete: `components/effects/border-glow.tsx`
- Modify: `components/ui/portfolio-card.tsx`
- Modify: `components/sections/projects.tsx`
- Modify: `e2e/portfolio.spec.ts`
- Modify: `e2e/responsive.spec.ts`

**Interfaces:**
- Produces: `ChromaCard({ children, className }: { children: ReactNode; className?: string })`.
- Produces: root markers `data-chroma-card` and `data-chroma-mode="enhanced|mobile|static"`.
- Preserves: `PortfolioCard({ children, className })` and its `data-portfolio-card` marker.

- [ ] **Step 1: Add failing project ownership and geometry assertions**

Update `e2e/portfolio.spec.ts`:

```ts
await expect(page.locator("#projects [data-portfolio-card]")).toHaveCount(2);
await expect(page.locator("#projects [data-chroma-card]")).toHaveCount(2);
await expect(page.locator("main [data-portfolio-card]")).toHaveCount(2);
```

Update the desktop project check to assert the first card is wider than the second and the mobile check to assert both cards stack and occupy the content width.

- [ ] **Step 2: Run the focused tests to verify RED**

Run:

```bash
npx playwright test e2e/portfolio.spec.ts e2e/responsive.spec.ts --workers=1 --grep "project|multi-column"
```

Expected: FAIL because Projects currently renders one `PortfolioCard` and one plain article.

- [ ] **Step 3: Implement `ChromaCard`**

Create a Client Component with this API:

```tsx
export function ChromaCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
})
```

The root must:

- expose `data-chroma-card` and capability mode;
- use one neutral card surface;
- render a stable conic-gradient border from the four chroma tokens;
- use `IntersectionObserver` to toggle one entry-sweep class on every exit/re-entry;
- attach pointer movement only in enhanced fine-pointer mode;
- store pointer coordinates in CSS custom properties rather than React state;
- clean up observer, media-query listeners, and pointer listeners;
- render no continuous animation under reduced motion.

Delete `BorderGlow` after its only consumer migrates.

- [ ] **Step 4: Render an asymmetric two-card project grid**

Update `Projects` so both entries render through `PortfolioCard`. Keep Vitae first and linked, keep AI Discord Chatbot second and unlinked, preserve all copy, and use:

```tsx
<div className="grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
```

Both project articles use the same internal structure and inline technology metadata.

- [ ] **Step 5: Build and run focused verification**

Run:

```bash
npm run lint && npm run build
npx playwright test e2e/portfolio.spec.ts e2e/responsive.spec.ts --workers=1 --grep "project|multi-column"
```

Expected: both chroma cards pass content, link, desktop asymmetry, mobile stacking, and runtime-error checks.

- [ ] **Step 6: Commit**

```bash
git add components/effects/chroma-card.tsx components/effects/border-glow.tsx components/ui/portfolio-card.tsx components/sections/projects.tsx e2e/portfolio.spec.ts e2e/responsive.spec.ts
git commit -m "feat: give both projects chromatic cards"
```

### Task 3: Unify the shape language and enlarge editorial typography

**Files:**
- Modify: `app/globals.css`
- Modify: `components/chrome/bubble-menu.tsx`
- Modify: `components/chrome/site-header.tsx`
- Modify: `components/chrome/theme-toggle.tsx`
- Modify: `components/effects/skills-marquee.tsx`
- Modify: `components/sections/about.tsx`
- Modify: `components/sections/contact-footer.tsx`
- Modify: `components/sections/experience.tsx`
- Modify: `components/sections/projects.tsx`
- Modify: `components/sections/publications.tsx`
- Modify: `components/ui/section-heading.tsx`
- Modify: `e2e/portfolio.spec.ts`
- Modify: `e2e/responsive.spec.ts`

**Interfaces:**
- Produces: computed `6px` radius on rectangular controls, tags, cards, and media.
- Produces: mobile Education institution size at least `44px`, Experience role size at least `36px`, and supporting text size at least `16px`.
- Preserves: 44px minimum interactive target size and no 390px overflow.

- [ ] **Step 1: Add failing computed-style assertions**

Add a browser test that checks the Bubble Menu trigger, open menu panel, Contact links, Skills tags, project chroma cards, and publication media all compute to `6px` border radius. Keep the home mark and theme toggle exempt as icon-only controls.

At 390x844, assert:

```ts
expect(parseFloat(educationStyle.fontSize)).toBeGreaterThanOrEqual(44);
expect(parseFloat(experienceStyle.fontSize)).toBeGreaterThanOrEqual(36);
expect(parseFloat(experienceBodyStyle.fontSize)).toBeGreaterThanOrEqual(16);
```

- [ ] **Step 2: Run focused tests to verify RED**

Run:

```bash
npx playwright test e2e/portfolio.spec.ts e2e/responsive.spec.ts --workers=1 --grep "shape|typography|multi-column"
```

Expected: FAIL on pill radii and current Education/Experience type sizes.

- [ ] **Step 3: Centralize the radius**

Set:

```css
:root,
.dark {
  --radius: 0.375rem;
}
```

Use `rounded-[var(--radius)]` for visible rectangles. Remove `rounded-full` from the Bubble Menu trigger, Contact links, and Skills tags. Keep circular shape only on icon-only header controls and decorative particle primitives.

- [ ] **Step 4: Raise the editorial type scale**

Apply these minimum responsive roles:

- Section headings: `text-5xl sm:text-6xl lg:text-7xl`.
- Education institution: `text-[clamp(2.75rem,7vw,4.5rem)]`.
- Education degree and metadata: base `text-lg` and `text-base`.
- Experience roles: `text-4xl sm:text-5xl`.
- Experience summaries: `text-lg leading-8` on larger screens and no smaller than `text-base leading-7` on mobile.
- Project descriptions and Contact message: `text-lg leading-8` at `sm`.
- Skills category headings: `text-3xl`; Skills tags: `text-sm`.

Adjust spacing and max-widths so larger type wraps intentionally.

- [ ] **Step 5: Verify shape, type, and mobile geometry**

Run:

```bash
npm run lint && npm run build
npx playwright test e2e/portfolio.spec.ts e2e/responsive.spec.ts --workers=1 --grep "shape|typography|multi-column|menu"
```

Expected: shared radii, larger type, 44px controls, and zero mobile overflow all pass.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css components/chrome components/effects/skills-marquee.tsx components/sections components/ui/section-heading.tsx e2e/portfolio.spec.ts e2e/responsive.spec.ts
git commit -m "feat: unify shape and editorial type scale"
```

### Task 4: Build the replayable Signal Spine motion system

**Files:**
- Modify: `components/chrome/scroll-progress.tsx`
- Modify: `components/effects/warp-text.tsx`
- Modify: `app/globals.css`
- Modify: `e2e/text-effects.spec.ts`
- Modify: `e2e/responsive.spec.ts`

**Interfaces:**
- Produces: `data-signal-spine`, `data-signal-fill`, and `data-signal-mode="enhanced|mobile|static"`.
- Produces: `data-warp-replay="true|static"` on each animated heading wrapper.
- Preserves: `ScrollProgress()` and `WarpText({ text, as?, className? })` exports.

- [ ] **Step 1: Add failing signal and replay assertions**

Add tests that:

- find exactly one Signal Spine;
- record `data-signal-fill` transform at the top, scroll to Contact, and assert the transform changes;
- assert section headings expose replay mode rather than one-shot mode;
- scroll Experience into view, out, and back, then verify its glyph transform returns to the settled state on re-entry;
- verify reduced motion reports static signal and static heading modes.

Example ownership assertions:

```ts
await expect(page.locator("[data-signal-spine]")).toHaveCount(1);
await expect(page.locator('[data-warp-replay="true"]')).toHaveCount(6);
```

- [ ] **Step 2: Run the focused tests to verify RED**

Run:

```bash
npx playwright test e2e/text-effects.spec.ts e2e/responsive.spec.ts --workers=1 --grep "Signal|replay|reduced motion"
```

Expected: FAIL because the current progress bar has no signal markers and `WarpText` uses `once: true`.

- [ ] **Step 3: Evolve `ScrollProgress` into the Signal Spine**

Keep `useScroll()` and `useSpring()`. Render:

- a fixed 2px neutral track;
- a scaleY chroma gradient fill;
- a small signal head translated by scroll progress;
- restrained echo lines using CSS pseudo-elements or static child spans.

Use the four chroma CSS variables and transform-only animation. Derive mobile/static mode from existing effect-policy media queries. Reduced motion renders one static gradient track without animated fill or head.

- [ ] **Step 4: Make `WarpText` replay without hiding content**

Change each glyph from one-time opacity reveal to visible position/rotation motion:

```tsx
initial={reducedMotion ? false : { y: 10, rotate: 1.5 }}
whileInView={reducedMotion ? undefined : { y: 0, rotate: 0 }}
viewport={{ once: false, amount: 0.72 }}
```

Do not animate opacity below `1`. Add stable replay/static data markers. Retain the screen-reader-only full heading.

- [ ] **Step 5: Verify desktop, mobile, re-entry, and reduced motion**

Run:

```bash
npm run lint && npm run test && npm run build
npx playwright test e2e/text-effects.spec.ts e2e/responsive.spec.ts e2e/portfolio.spec.ts --workers=1 --grep "Signal|replay|reduced motion|semantics"
```

Expected: signal progress, bidirectional replay, static reduced motion, and stable heading semantics pass.

- [ ] **Step 6: Commit**

```bash
git add components/chrome/scroll-progress.tsx components/effects/warp-text.tsx app/globals.css e2e/text-effects.spec.ts e2e/responsive.spec.ts
git commit -m "feat: add replayable chromatic signal spine"
```

### Task 5: Run mechanical design and functional audits

**Files:**
- Modify as failures require: files changed in Tasks 1–4.
- Modify: `e2e/portfolio.spec.ts`
- Modify: `e2e/responsive.spec.ts`
- Modify: `e2e/text-effects.spec.ts`

**Interfaces:**
- Produces: mechanically verified ownership for shape, chroma, motion, typography, and font constraints.

- [ ] **Step 1: Run source audits**

Run:

```bash
git grep -n 'rounded-full' -- components app
git grep -nE 'violet|purple|#(?:[Aa-Ff0-9]{6})' -- components app
git grep -n 'once: true' -- components
git grep -nE 'font-mono|font-family' -- app components
git grep -n 'ChromaCard\|data-chroma-card' -- components
git grep -n 'PortfolioCard' -- components/sections
```

Expected:

- `rounded-full` remains only on icon-only controls and decorative particles.
- No violet or purple chroma exists.
- No heading viewport animation uses `once: true`.
- Geist Mono usage remains limited to ASCII.
- Projects owns exactly two `PortfolioCard` renders and both route through `ChromaCard`.

- [ ] **Step 2: Run the complete functional browser matrix serially**

Run:

```bash
npm run lint && npm run test && npm run build
npx playwright test e2e/portfolio.spec.ts e2e/responsive.spec.ts e2e/text-effects.spec.ts e2e/theme.spec.ts --workers=1 --grep-invert "matches the approved"
```

Expected: every functional test passes with zero retries.

- [ ] **Step 3: Inspect runtime geometry and diagnostics**

Use Next.js MCP `nextjs_index`, `get_errors`, `get_routes`, and `get_page_metadata`. Use Playwright text snapshots and computed styles at 1280x720 and 390x844 in light, dark, and reduced-motion modes. Verify no console/runtime errors, overflow, clipped ASCII, hidden headings, or unsafe menu geometry.

- [ ] **Step 4: Make only evidence-driven cleanup edits**

For each audit failure, add or preserve a focused regression assertion, apply the smallest source fix, rebuild, and rerun the failed command before proceeding.

- [ ] **Step 5: Commit audit cleanup if any files changed**

```bash
git add app components e2e
git commit -m "refactor: enforce signal spine design constraints"
```

Skip this commit when the audit produces no source changes.

### Task 6: Refresh baselines and complete release verification

**Files:**
- Modify: `e2e/__screenshots__/chromium/*.png`
- Modify: `/Users/berat/Projects/library/Projects/portfolio-website.md`

**Interfaces:**
- Produces: sixteen current light/dark baselines, green `npm run verify`, clean repository state, and durable project context.

- [ ] **Step 1: Run the full suite before approving visual changes**

Run:

```bash
npm run verify
```

Expected: all functional checks pass; only the two screenshot-baseline tests may fail because the approved design changed.

- [ ] **Step 2: Back up and regenerate all baselines**

Run:

```bash
cp -R e2e/__screenshots__ /tmp/portfolio-signal-spine-baselines-before-refresh
npx playwright test e2e/responsive.spec.ts --update-snapshots --workers=1
```

Expected: all responsive tests pass and sixteen files under `e2e/__screenshots__/chromium/` update.

- [ ] **Step 3: Run final zero-retry verification**

Run:

```bash
npm run verify
```

Expected: ESLint passes, all Vitest tests pass, the production build succeeds, and all Playwright functional and screenshot tests pass with zero retries.

- [ ] **Step 4: Update the project vault**

Update `/Users/berat/Projects/library/Projects/portfolio-website.md` with the final commit sequence, Signal Spine and chroma decisions, exact verification counts, and remaining pre-existing warnings.

- [ ] **Step 5: Commit verification artifacts**

```bash
git add e2e/__screenshots__ e2e app components
git commit -m "test: approve signal spine portfolio revision"
```

- [ ] **Step 6: Inspect final state**

Run:

```bash
git status --short
git log -12 --oneline
```

Expected: clean working tree and a focused, reviewable commit sequence.

- [ ] **Step 7: Complete the branch workflow**

Invoke `superpowers:finishing-a-development-branch`, re-run the full suite required by that workflow, detect the normal repository environment, and present the standard integration options without pushing or merging unless explicitly authorized.
