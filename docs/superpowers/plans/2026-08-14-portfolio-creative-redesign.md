# Portfolio Creative Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved creative redesign with a faithful, responsive React Bits-style ASCII hero, one clear visual signature, varied section compositions, intentional Archivo typography, and a fully passing browser matrix.

**Architecture:** Keep the one-page Server Component structure and typed content module. Replace the current five-row ASCII alphabet with a Client Component wrapper, a framework-independent Three.js scene controller, and pure image-to-ASCII utilities that can be unit tested. Recompose existing sections without changing their data contracts or anchor IDs.

**Tech Stack:** Next.js 16.3.0 App Router, React 19, TypeScript strict, Tailwind CSS v4, Motion 13, Three.js, Vitest, Playwright.

## Global Constraints

- Preserve section order: Hero, About, Publications, Experience, Projects, Skills, Contact.
- Preserve all URLs, visible factual content, theme behavior, effect policy, safe-area behavior, and semantic landmarks.
- Archivo is the only non-ASCII font; Geist Mono is used only for aligned ASCII output.
- All colors resolve from `app/globals.css` CSS variables; components contain no hardcoded color literals.
- Desktop fine-pointer clients receive animated waves and pointer tilt; mobile receives lower-cost motion; reduced motion renders one stable frame.
- The hero heading and action must be fully visible at 1280x720 and 390x844.
- GitHub, LinkedIn, and Resume appear together only in Contact; Hero has one internal `#projects` action.
- Skills is the only repeating pill treatment and the only marquee.
- BorderGlow appears only on the featured Vitae project.
- No decorative numbering or image-overlay labels.
- Consult the installed Next.js 16 docs before changing application code.

---

## File Structure

- Create `lib/ascii-frame.ts`: pure luminance and image-data to ASCII conversion.
- Create `lib/ascii-frame.test.ts`: deterministic unit coverage for conversion boundaries and sampling.
- Create `components/effects/ascii-scene.ts`: owns Three.js renderer, canvases, animation lifecycle, resizing, pointer response, and disposal.
- Modify `components/effects/ascii-text.tsx`: React wrapper, capability selection, semantic fallback, and scene lifecycle.
- Modify `app/globals.css`: typography resolution, anchor cascade fix, ASCII visual styles, responsive/reduced-motion behavior.
- Modify `components/sections/hero.tsx`: simplified four-element hero.
- Modify `components/sections/about.tsx`: editorial education panel without glow card or pills.
- Modify `components/sections/publications.tsx`: full-width media rows without card shells or indices.
- Modify `components/sections/experience.tsx`: chronological divided list without cards, indices, or pills.
- Modify `components/sections/projects.tsx`: featured Vitae glow treatment plus supporting editorial project.
- Modify `components/sections/contact-footer.tsx`: sole external profile-link group.
- Modify `e2e/portfolio.spec.ts`: hero action, CTA contrast, footer link ownership, and semantics.
- Modify `e2e/responsive.spec.ts`: ASCII containment, updated section geometry, and refreshed screenshots.
- Modify `package.json` and `package-lock.json`: add `three` and `@types/three`.

---

### Task 1: Add deterministic ASCII conversion utilities

**Files:**
- Create: `lib/ascii-frame.ts`
- Create: `lib/ascii-frame.test.ts`

**Interfaces:**
- Produces: `luminanceToGlyph(luminance: number, glyphs?: string): string`
- Produces: `imageDataToAscii(input: { data: Uint8ClampedArray; width: number; height: number; cellSize: number; glyphs?: string }): string`
- Consumed by: `components/effects/ascii-scene.ts`

- [ ] **Step 1: Write failing unit tests**

```ts
import { describe, expect, it } from "vitest";
import { imageDataToAscii, luminanceToGlyph } from "./ascii-frame";

describe("luminanceToGlyph", () => {
  it("maps dark and bright pixels to opposite glyph extremes", () => {
    expect(luminanceToGlyph(0, " .#")).toBe(" ");
    expect(luminanceToGlyph(255, " .#")).toBe("#");
  });
});

describe("imageDataToAscii", () => {
  it("samples RGBA image data into stable rows", () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 0, 0, 0, 255,
    ]);
    expect(imageDataToAscii({ data, width: 2, height: 2, cellSize: 1, glyphs: " .#" }))
      .toBe(" #\n# ");
  });
});
```

- [ ] **Step 2: Run the tests and confirm the missing-module failure**

Run: `npx vitest run lib/ascii-frame.test.ts`
Expected: FAIL because `lib/ascii-frame.ts` does not exist.

- [ ] **Step 3: Implement clamped luminance mapping and cell sampling**

```ts
const DEFAULT_GLYPHS = " .,:;irsXA253hMHGS#9B&@";

export function luminanceToGlyph(luminance: number, glyphs = DEFAULT_GLYPHS) {
  const value = Math.min(255, Math.max(0, luminance));
  const index = Math.round((value / 255) * (glyphs.length - 1));
  return glyphs[index] ?? glyphs[glyphs.length - 1] ?? " ";
}
```

Implement `imageDataToAscii` by averaging RGB luminance within each `cellSize` square, preserving rows and never reading beyond width or height.

- [ ] **Step 4: Run focused and complete unit tests**

Run: `npx vitest run lib/ascii-frame.test.ts && npm run test`
Expected: focused tests and all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/ascii-frame.ts lib/ascii-frame.test.ts
git commit -m "test: define ascii frame conversion"
```

### Task 2: Port the React Bits ASCII scene with capability fallbacks

**Files:**
- Create: `components/effects/ascii-scene.ts`
- Modify: `components/effects/ascii-text.tsx`
- Modify: `app/globals.css`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `imageDataToAscii` from `@/lib/ascii-frame`
- Produces: `class AsciiScene` with constructor options `{ root, canvas, sampleCanvas, output, text, animated, interactive, cellSize }`
- Produces: `resize(): void`, `renderOnce(): void`, `start(): void`, `dispose(): void`
- Preserves: `<AsciiText text={string} className?: string />`

- [ ] **Step 1: Install verified dependencies**

Run: `npm install three && npm install -D @types/three`
Expected: package manifests record compatible current releases.

- [ ] **Step 2: Fetch and inspect the official source and license**

Run: `gh api repos/DavidHDev/react-bits/contents/src/ts-tailwind/TextAnimations/ASCIIText/ASCIIText.tsx --jq .content | base64 --decode > /tmp/react-bits-ascii-text.tsx && gh api repos/DavidHDev/react-bits/contents/LICENSE --jq .content | base64 --decode > /tmp/react-bits-license.txt`
Expected: the source confirms the canvas, WebGL shader, downsampling, pointer, and ASCII overlay architecture; the license permits local adaptation.

- [ ] **Step 3: Implement `AsciiScene` as a deep lifecycle module**

The class must:

- Create one transparent `THREE.WebGLRenderer` using the supplied canvas.
- Draw Archivo text to an offscreen text canvas and upload it as a texture.
- Render a plane with restrained wave distortion controlled by `animated`.
- Resize with `ResizeObserver` dimensions and a capped device pixel ratio.
- Read the WebGL result through the supplied sample canvas.
- Call `imageDataToAscii` and write only `output.textContent`.
- Attach pointer movement only when `interactive` is true.
- Run one frame for static mode and `requestAnimationFrame` only for animated mode.
- Dispose listeners, observers, RAF, textures, geometry, materials, and renderer in `dispose()`.

- [ ] **Step 4: Replace the fixed glyph wrapper**

`AsciiText` must keep the stable semantic text in `sr-only`, render a responsive `data-ascii-root` container, and initialize `AsciiScene` in an effect. Derive:

```ts
const profile = getEffectProfile({ finePointer, mobile, reducedMotion });
const animated = !reducedMotion;
const interactive = profile.pointerEffects;
const cellSize = mobile ? 10 : 8;
```

On construction/render errors, set `data-ascii-fallback="true"` and display the static fallback word. Cleanup must call `scene.dispose()`.

- [ ] **Step 5: Add token-driven ASCII styling**

Add CSS variables for ASCII foreground and gradient stops that reuse `--foreground` and `--portfolio-accent`. Size the root with `clamp()` and `min()` so it cannot exceed the viewport. Keep `pre` at `font-family: var(--font-geist-mono)` and hide overflow within the effect root, not the page.

- [ ] **Step 6: Run diagnostics**

Run: `npm run lint && npm run test && npm run build`
Expected: no lint, TypeScript, test, or build failures.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json lib/ascii-frame.ts components/effects/ascii-scene.ts components/effects/ascii-text.tsx app/globals.css
git commit -m "feat: port responsive ascii hero effect"
```

### Task 3: Fix typography and interactive color cascade

**Files:**
- Modify: `app/globals.css`
- Modify: `e2e/portfolio.spec.ts`

**Interfaces:**
- Produces: Archivo computed body font in both themes.
- Produces: explicit anchor text utilities that are not overridden by a global unlayered rule.

- [ ] **Step 1: Add a failing computed-style browser assertion**

Add a test that opens light and dark contexts and asserts the hero action text differs from its background and `document.body` includes `Archivo` in its computed `fontFamily`.

```ts
const styles = await action.evaluate((element) => {
  const style = getComputedStyle(element);
  return { color: style.color, backgroundColor: style.backgroundColor };
});
expect(styles.color).not.toBe(styles.backgroundColor);
expect(await page.locator("body").evaluate((el) => getComputedStyle(el).fontFamily))
  .toContain("Archivo");
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npx playwright test e2e/portfolio.spec.ts --workers=1 --grep "contrast and typography"`
Expected: FAIL on the current 1:1 CTA contrast or system body font.

- [ ] **Step 3: Fix the cascade and font variables**

Remove the unlayered `a { color: inherit; }` rule or restrict it to unclassed anchors. Resolve `--font-sans` and `--font-serif` to `var(--font-archivo)` in both theme roots so direct `body { font-family: var(--font-sans) }` uses Archivo.

- [ ] **Step 4: Re-run the focused test**

Run: `npx playwright test e2e/portfolio.spec.ts --workers=1 --grep "contrast and typography"`
Expected: PASS in light and dark.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css e2e/portfolio.spec.ts
git commit -m "fix: restore portfolio typography and contrast"
```

### Task 4: Simplify the hero and deduplicate action intent

**Files:**
- Modify: `components/sections/hero.tsx`
- Modify: `data/content.ts`
- Modify: `e2e/portfolio.spec.ts`
- Modify: `e2e/responsive.spec.ts`

**Interfaces:**
- Hero consumes `identity.name`, `identity.shortName`, `hero.bio`, and one internal project action.
- Contact remains the sole consumer of `profileLinks`.

- [ ] **Step 1: Update browser expectations first**

Assert that Hero contains one `View projects` link to `#projects`, contains no visible GitHub/LinkedIn/Resume links, and Contact contains all three external destinations exactly once. Add explicit ASCII and H1 rectangle containment at 1280x720 and 390x844.

- [ ] **Step 2: Run focused tests and confirm current failures**

Run: `npx playwright test e2e/portfolio.spec.ts e2e/responsive.spec.ts --workers=1 --grep "hero|profile actions|ASCII"`
Expected: FAIL because the current hero exposes three external links and clips its H1.

- [ ] **Step 3: Implement the four-element hero**

Render the semantic H1 with the ASCII component, one paragraph using `hero.bio`, and one internal anchor:

```tsx
<a href="#projects" className="min-h-11 border border-foreground bg-foreground px-6 text-background">
  View projects
</a>
```

Remove `ScrambledText`, `TraitRotator`, and `ExternalLink` from Hero. Keep the hero within `min-h-[100dvh]` with responsive spacing.

- [ ] **Step 4: Keep content ownership explicit**

Keep `hero.traits` in the typed content only if another visible component consumes it. Otherwise remove the field and data because the approved hero no longer renders rotating traits. Keep `profileLinks` for Contact and identity metadata.

- [ ] **Step 5: Re-run focused tests**

Run: `npx playwright test e2e/portfolio.spec.ts e2e/responsive.spec.ts --workers=1 --grep "hero|profile actions|ASCII"`
Expected: PASS at both target viewports.

- [ ] **Step 6: Commit**

```bash
git add components/sections/hero.tsx data/content.ts e2e/portfolio.spec.ts e2e/responsive.spec.ts
git commit -m "feat: focus portfolio hero hierarchy"
```

### Task 5: Recompose About and Publications

**Files:**
- Modify: `components/sections/about.tsx`
- Modify: `components/sections/publications.tsx`
- Modify: `e2e/responsive.spec.ts`

**Interfaces:**
- Preserve existing About and Publication prop types and content data.
- Remove `PortfolioCard` from both sections.

- [ ] **Step 1: Add structural assertions**

Add stable data attributes and assert that About exposes one education panel and Publications exposes two media rows without numeric overlay text. Assert every multi-column structure collapses to one column at 390px.

- [ ] **Step 2: Implement About editorial grouping**

Use the existing asymmetric grid. Render education inside an `aside` with one border and padded inset. Render coursework as a two-column or wrapping plain-text list separated by spacing, not rounded backgrounds.

- [ ] **Step 3: Implement full-width publication rows**

Each article uses `md:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]`, a 16:10 image, and stacked venue/date/title metadata. Remove `PortfolioCard`, `index`, overlay spans, and stagger classes.

- [ ] **Step 4: Run focused responsiveness and semantics checks**

Run: `npx playwright test e2e/responsive.spec.ts e2e/portfolio.spec.ts --workers=1 --grep "multi-column|publications|education"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/sections/about.tsx components/sections/publications.tsx e2e/responsive.spec.ts
git commit -m "feat: vary about and publication layouts"
```

### Task 6: Recompose Experience and Projects

**Files:**
- Modify: `components/sections/experience.tsx`
- Modify: `components/sections/projects.tsx`
- Modify: `e2e/portfolio.spec.ts`
- Modify: `e2e/responsive.spec.ts`

**Interfaces:**
- Preserve existing Experience and Project prop types.
- Experience produces divided chronology rows.
- Projects uses `PortfolioCard` only for the linked Vitae feature.

- [ ] **Step 1: Add structural assertions**

Assert no experience or project index labels are rendered, all role/project text remains present, Vitae is linked, and the supporting AI Discord project remains unlinked.

- [ ] **Step 2: Implement the experience chronology**

Use an ordered semantic list without visible numeric labels. Each row uses a date column and content column above `md`, one bottom divider, and inline technology metadata separated by commas or middots limited to one per line. Do not use pills or `PortfolioCard`.

- [ ] **Step 3: Implement project hierarchy**

Render Vitae in the larger grid column wrapped by the single remaining `PortfolioCard`. Render AI Discord Chatbot as a bordered-top supporting article without glow. Use plain inline technology metadata in both.

- [ ] **Step 4: Run focused tests**

Run: `npx playwright test e2e/portfolio.spec.ts e2e/responsive.spec.ts --workers=1 --grep "role|project|multi-column"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/sections/experience.tsx components/sections/projects.tsx e2e/portfolio.spec.ts e2e/responsive.spec.ts
git commit -m "feat: establish experience and project hierarchy"
```

### Task 7: Audit motion, cards, pills, and source-level design constraints

**Files:**
- Modify as needed: `components/effects/skills-marquee.tsx`
- Modify as needed: `components/sections/contact-footer.tsx`
- Modify: `e2e/portfolio.spec.ts`

**Interfaces:**
- Skills remains the only marquee and repeated pill system.
- Contact remains the sole external profile action group.

- [ ] **Step 1: Run mechanical source audits**

Run:

```bash
git grep -n 'font-mono' -- app components data
git grep -nE 'padStart|—|–' -- app components data
git grep -n 'PortfolioCard' -- components/sections
git grep -n 'rounded-full' -- components/sections components/effects/skills-marquee.tsx
```

Expected:

- `font-mono` appears only in ASCII-related styling.
- No decorative index generation or em/en dash separators remain.
- `PortfolioCard` is used only for Vitae.
- Repeating content pills exist only in Skills; interactive buttons may remain rounded.

- [ ] **Step 2: Add ownership assertions**

Add a browser assertion that exactly one skills marquee exists, exactly one glow card exists in content sections, and external profile destinations are visible only under Contact.

- [ ] **Step 3: Make the minimum cleanup edits needed to satisfy the audits**

Do not remove the Bubble Menu, prismatic background, pointer effects, or Skills marquee. Preserve their capability gating and reduced-motion behavior.

- [ ] **Step 4: Run lint, unit tests, and the functional browser matrix**

Run: `npm run lint && npm run test && npx playwright test e2e/portfolio.spec.ts e2e/responsive.spec.ts e2e/text-effects.spec.ts e2e/theme.spec.ts --workers=1 --grep-invert "matches the approved"`
Expected: all functional checks pass.

- [ ] **Step 5: Commit**

```bash
git add components e2e/portfolio.spec.ts
git commit -m "refactor: enforce portfolio design hierarchy"
```

### Task 8: Refresh visual baselines and complete production verification

**Files:**
- Modify: `e2e/__screenshots__/chromium/*.png`
- Modify if needed: tests or implementation files revealed by verification
- Modify: `/Users/berat/Projects/library/Projects/portfolio-website.md`

**Interfaces:**
- Produces a clean repository and a complete, current verification record.

- [ ] **Step 1: Run Next.js runtime diagnostics**

Use `nextjs_index`, then `get_errors`, `get_routes`, and `get_page_metadata` against the running Next.js 16 server. Expected: the root route compiles and no config, compilation, or browser runtime errors are present.

- [ ] **Step 2: Verify in a real browser**

Use text snapshots and computed geometry at 1280x720 and 390x844 in both themes. Confirm:

- ASCII bounds stay within the viewport.
- Hero action is visible and has non-identical text/background colors.
- Body font computes to Archivo.
- Bubble Menu opens, exposes every section link, handles Escape, and remains above the safe area.
- Reduced-motion mode has no continuous ASCII or marquee animation.

- [ ] **Step 3: Run the complete verification suite before baseline updates**

Run: `npm run lint && npm run test && npm run build && npm run test:e2e`
Expected: functional checks pass; only screenshot comparisons may fail because the approved visual baseline changed.

- [ ] **Step 4: Regenerate approved screenshots**

Run: `npx playwright test e2e/responsive.spec.ts --update-snapshots`
Expected: sixteen light/dark full-page and section baselines update deterministically.

- [ ] **Step 5: Re-run the complete zero-retry suite**

Run: `npm run verify`
Expected: lint passes, 7+ unit tests pass, production build passes, and all 28+ Playwright tests pass with zero retries.

- [ ] **Step 6: Run the design pre-flight**

Confirm the source audits from Task 7, both themes, mobile geometry, focus visibility, reduced motion, CTA contrast, copy, and card/marquee limits. Do not claim completion if any item fails.

- [ ] **Step 7: Update the project vault**

Record the final commit state, dependencies, design decisions, and exact verification counts in `/Users/berat/Projects/library/Projects/portfolio-website.md` using the `vault-note` workflow.

- [ ] **Step 8: Commit final verification artifacts**

```bash
git add e2e/__screenshots__ e2e components app lib package.json package-lock.json
git commit -m "test: approve creative portfolio redesign"
```

- [ ] **Step 9: Inspect final repository state**

Run: `git status --short && git log -8 --oneline`
Expected: clean working tree and a reviewable sequence of focused commits.
