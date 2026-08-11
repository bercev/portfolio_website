# Portfolio Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify Berat Ercevik’s complete one-page portfolio from the approved brief, resume, and design specification.

**Architecture:** Render portfolio content and section structure as Server Components, with browser-dependent behavior isolated in focused Client Components. Keep all copy and URLs in one typed content module, all concrete colors in CSS variables, and all device/reduced-motion decisions behind a shared effect policy. Use Vitest for pure invariants and Playwright against the production build for behavior, accessibility, responsive layout, links, runtime health, and deterministic screenshots.

**Tech Stack:** Next.js 16.3.0 App Router, React 19, strict TypeScript, Tailwind CSS v4, shadcn/ui conventions, Motion 13, next-themes, Phosphor Icons, Vitest, Playwright, Netlify.

## Global Constraints

- Follow `docs/prompts/starting_prompt.md` and `docs/superpowers/specs/2026-08-08-portfolio-design.md`; the approved spec wins if they conflict.
- Use Chalk Slate by Serafim for light and dark tokens, with cyan `#00d8ff` as the single accent.
- Keep every theme, accent, and effect color in `app/globals.css`; components must not contain concrete hex colors.
- Keep `app/page.tsx` and static section markup server-rendered; add `'use client'` only to interactive leaves.
- Preserve section order: Hero, About, Publications, Experience, Projects, Skills, Contact.
- Keep all visible portfolio content and URLs in `data/content.ts`; do not invent facts, affiliations, email addresses, or links.
- Use first-person copy and no stat-counter or proof-point UI. Dates and the required 4.0 GPA are factual metadata.
- Use Instrument Serif for display text, a sans body face, and a mono label face through `next/font` CSS variables.
- Gate Pixel Trail and Click Spark behind `(hover: hover) and (pointer: fine)` and disable their work, not only their visibility, on touch.
- Reduce Prismatic Burst work on mobile and render static decoration under `prefers-reduced-motion`.
- Keep continuous effects decorative (`aria-hidden`, pointer-inert); expose stable semantic text beneath animated presentation.
- Preserve the exact Pixel Trail settings: `interpolate=2.7`, `maxAge=300`, `gooStrength=1`, `gridSize=90`, cyan accent.
- Use Click Spark settings `sparkCount=6`, `sparkSize=7` and Scrambled Text characters `@#$%^`.
- Verify light and dark modes, 390px mobile, reduced motion, navigation, links, runtime errors, keyboard access, and screenshots in Playwright.
- Do not commit or push unless the user explicitly requests it.

## File Structure

- `app/layout.tsx` - static metadata, font variables, and provider composition.
- `app/page.tsx` - server-rendered page composition in approved section order.
- `app/globals.css` - Chalk Slate tokens, accent/effect variables, Tailwind mappings, base layout, accessibility, and reduced-motion rules.
- `app/icon.tsx` - generated portfolio icon.
- `app/opengraph-image.tsx` - generated social preview.
- `components/providers/theme-provider.tsx` - client wrapper around next-themes.
- `components/chrome/site-header.tsx` - minimal top identity and theme control.
- `components/chrome/theme-toggle.tsx` - hydration-safe persisted light/dark toggle.
- `components/chrome/bubble-menu.tsx` - bottom-center expandable section navigation.
- `components/chrome/scroll-progress.tsx` - right-edge Motion scroll progress.
- `components/effects/effect-stage.tsx` - global decorative effect composition.
- `components/effects/prismatic-burst.tsx` - cyan canvas background with desktop/mobile/static profiles.
- `components/effects/pixel-trail.tsx` - fine-pointer-only pixel trail canvas.
- `components/effects/click-spark.tsx` - fine-pointer-only click spark overlay.
- `components/effects/ascii-text.tsx` - accessible ASCII presentation of “Berat”.
- `components/effects/scrambled-text.tsx` - stable-label text scramble.
- `components/effects/warp-text.tsx` - restrained character warp for section headings/traits.
- `components/effects/border-glow.tsx` - reusable glow shell for semantic cards.
- `components/effects/trait-rotator.tsx` - reduced-motion-aware rotating trait line.
- `components/effects/skills-marquee.tsx` - keyboard-safe, reduced-motion-aware skill rows.
- `components/sections/hero.tsx` - hero content and links.
- `components/sections/about.tsx` - first-person biography and education card.
- `components/sections/publications.tsx` - paper cards with local preview placeholders.
- `components/sections/experience.tsx` - factual role timeline/cards.
- `components/sections/projects.tsx` - Vitae and Discord project cards.
- `components/sections/skills.tsx` - categorized skills presentation.
- `components/sections/contact-footer.tsx` - GitHub, LinkedIn, and resume closing links.
- `components/ui/section-heading.tsx` - semantic section heading with optional Warp Text enhancement.
- `components/ui/portfolio-card.tsx` - common Border Glow card surface.
- `components/ui/external-link.tsx` - consistent external-link semantics.
- `data/content.ts` - the only content/URL source of truth.
- `data/content.test.ts` - content invariants.
- `lib/effect-policy.ts` - pure capability-to-profile mapping.
- `lib/effect-policy.test.ts` - unit tests for effect gating.
- `lib/utils.ts` - shadcn-compatible class merging.
- `public/resume.pdf` - deployable resume download.
- `public/publications/skilloptimizer.svg` - replaceable 16:10 paper placeholder.
- `public/publications/grokset.svg` - replaceable 16:10 paper placeholder.
- `playwright.config.ts` - production-server browser test configuration.
- `e2e/portfolio.spec.ts` - content, order, navigation, links, and runtime tests.
- `e2e/theme.spec.ts` - system theme, toggle, persistence, and both-mode screenshots.
- `e2e/responsive.spec.ts` - 390px, pointer gating, reduced motion, and overflow tests.
- `netlify.toml` - reproducible Netlify build configuration.
- `README.md` - project-specific setup, content editing, tests, and deployment.

---

### Task 1: Establish dependencies, scripts, and test harness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `components.json`
- Create: `lib/utils.ts`

**Interfaces:**
- Produces: `npm run test`, `npm run test:e2e`, `npm run verify`; `cn(...inputs: ClassValue[]): string`; Playwright `baseURL` at `http://127.0.0.1:3000`.

- [ ] **Step 1: Confirm version-accurate Next.js guidance**

Read these installed guides before changing code:

```text
node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md
node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md
node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/public-folder.md
```

- [ ] **Step 2: Install the approved runtime and test dependencies**

Run:

```bash
npm install motion@^13 next-themes @phosphor-icons/react clsx tailwind-merge
npm install -D vitest @playwright/test
npx playwright install chromium
```

Expected: package installation exits 0 and `npm ls --depth=0` lists every package without invalid or missing dependencies.

- [ ] **Step 3: Add repeatable scripts**

Set `package.json` scripts to include:

```json
{
  "lint": "eslint .",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "verify": "npm run lint && npm run test && npm run build && npm run test:e2e"
}
```

- [ ] **Step 4: Configure Vitest for strict TypeScript unit tests**

Create `vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    passWithNoTests: true,
  },
});
```

- [ ] **Step 5: Configure Playwright against a production server**

Create `playwright.config.ts` with Chromium, `baseURL`, trace/screenshot retention on failure, and:

```ts
webServer: {
  command: "npm run start",
  url: "http://127.0.0.1:3000",
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
},
```

The final verification sequence builds before running Playwright, so the browser always exercises production output.

- [ ] **Step 6: Initialize shadcn-compatible project metadata without importing default visual styling**

Create `components.json` for Tailwind v4, RSC, TSX, `app/globals.css`, neutral base, and `@/*` aliases. Create `lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 7: Run foundation checks**

Run:

```bash
npm ls --depth=0
npm run lint
npm run test
```

Expected: dependencies and lint pass; Vitest exits successfully even before focused tests are added.

### Task 2: Model and verify the portfolio content

**Files:**
- Create: `data/content.test.ts`
- Create: `data/content.ts`
- Copy: `resume.pdf` to `public/resume.pdf`
- Create: `public/publications/skilloptimizer.svg`
- Create: `public/publications/grokset.svg`

**Interfaces:**
- Produces: `SectionId`, `ExternalLink`, `Publication`, `Experience`, `Project`, `PortfolioContent`, and `portfolio satisfies PortfolioContent`.
- Content consumers import only `portfolio` and relevant exported types.

- [ ] **Step 1: Write failing content-invariant tests**

Create `data/content.test.ts` asserting:

```ts
import { describe, expect, it } from "vitest";
import { portfolio } from "./content";

const approvedOrder = [
  "home",
  "about",
  "publications",
  "experience",
  "projects",
  "skills",
  "contact",
];

describe("portfolio content", () => {
  it("keeps navigation in approved section order", () => {
    expect(portfolio.navigation.map((item) => item.id)).toEqual(approvedOrder);
  });

  it("gives previews only to publications", () => {
    expect(portfolio.publications.every((paper) => paper.preview.src.startsWith("/publications/"))).toBe(true);
    expect(portfolio.projects.every((project) => !("preview" in project))).toBe(true);
    expect(portfolio.experience.every((role) => !("preview" in role))).toBe(true);
  });

  it("uses only confirmed general contact links", () => {
    expect(portfolio.contact.links.map((link) => link.label)).toEqual(["GitHub", "LinkedIn", "Resume"]);
    expect(JSON.stringify(portfolio)).not.toContain("mailto:");
  });

  it("keeps canonical publication URLs", () => {
    expect(portfolio.publications.map((paper) => paper.href)).toEqual([
      "https://openreview.net/forum?id=nZYF0aPAMP",
      "https://arxiv.org/abs/2602.21236",
    ]);
  });
});
```

- [ ] **Step 2: Run the tests and confirm RED**

Run: `npm run test -- data/content.test.ts`

Expected: FAIL because `data/content.ts` does not exist.

- [ ] **Step 3: Implement the typed content source**

Define readonly types and one `portfolio` object containing:

- Identity: Berat Ercevik, software engineer, GitHub, LinkedIn, `/resume.pdf`.
- Hero: tagline “I build software that reasons, adapts, and ships.”; traits Curious, Rigorous, Collaborative, Resourceful; concise first-person bio.
- About: first-person factual bio and education at UC Santa Cruz, B.S. Computer Science, 4.0/4.0, Sep 2024-Dec 2026, listed coursework.
- Publications: exact titles “SkillOptimizer: Agent Skill Optimization Through Subskills Without Task Supervision.” and “@GrokSet: Multi-party Human-LLM Interactions in Social Media.” with venue/date, canonical URLs, and placeholder metadata.
- Experience: Stealth Startup AI Systems Engineer Intern; DSA Tutor with no invented employer; Algoverse LLM Researcher using the exact term BERTopic; Trustd.ai SWE Intern. Use factual summaries without metric-led proof-point copy.
- Projects: Vitae with `https://vitae.tools/`; AI Discord Chatbot without an invented URL.
- Skills: the resume’s Languages, Tools, Frameworks, and Knowledge categories.
- Contact: GitHub, LinkedIn, Resume only.

Use `satisfies PortfolioContent` and readonly arrays so missing fields fail at compile time.

- [ ] **Step 4: Add deployable static assets**

Copy the canonical PDF to `public/resume.pdf`. Create two 1600x1000 SVG placeholder assets containing only semantic paper-title typography, a restrained document grid, and CSS-variable-compatible neutral/cyan presentation. The components reference `/publications/skilloptimizer.svg` and `/publications/grokset.svg` with descriptive alt text.

- [ ] **Step 5: Run content tests and confirm GREEN**

Run:

```bash
npm run test -- data/content.test.ts
npm run lint
```

Expected: all content invariants pass and lint reports no issues.

### Task 3: Implement the shared effect policy test-first

**Files:**
- Create: `lib/effect-policy.test.ts`
- Create: `lib/effect-policy.ts`

**Interfaces:**
- Produces: `EffectCapabilities`, `EffectProfile`, `getEffectProfile(capabilities): EffectProfile`, and exported query constants.

- [ ] **Step 1: Write failing capability tests**

Test these exact outcomes:

```ts
expect(getEffectProfile({ reducedMotion: true, finePointer: true, mobile: false })).toEqual({
  mode: "static",
  pointerEffects: false,
  particleCount: 0,
});
expect(getEffectProfile({ reducedMotion: false, finePointer: false, mobile: true })).toEqual({
  mode: "mobile",
  pointerEffects: false,
  particleCount: 18,
});
expect(getEffectProfile({ reducedMotion: false, finePointer: true, mobile: false })).toEqual({
  mode: "enhanced",
  pointerEffects: true,
  particleCount: 42,
});
```

- [ ] **Step 2: Run the tests and confirm RED**

Run: `npm run test -- lib/effect-policy.test.ts`

Expected: FAIL because the policy module is missing.

- [ ] **Step 3: Implement the pure policy**

Export:

```ts
export const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
export const MOBILE_QUERY = "(max-width: 767px)";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function getEffectProfile(capabilities: EffectCapabilities): EffectProfile {
  if (capabilities.reducedMotion) return { mode: "static", pointerEffects: false, particleCount: 0 };
  if (capabilities.mobile || !capabilities.finePointer) return { mode: "mobile", pointerEffects: false, particleCount: 18 };
  return { mode: "enhanced", pointerEffects: true, particleCount: 42 };
}
```

- [ ] **Step 4: Run policy tests and confirm GREEN**

Run: `npm run test -- lib/effect-policy.test.ts`

Expected: all three capability profiles pass.

### Task 4: Build the theme, typography, metadata, and app shell

**Files:**
- Create: `components/providers/theme-provider.tsx`
- Create: `components/chrome/theme-toggle.tsx`
- Modify: `app/layout.tsx`
- Replace: `app/globals.css`
- Create: `app/icon.tsx`
- Create: `app/opengraph-image.tsx`

**Interfaces:**
- `ThemeProvider({ children }: { children: React.ReactNode })` wraps `next-themes` with `attribute="class"`, `defaultTheme="system"`, and `enableSystem`.
- `ThemeToggle()` renders a stable 40x40 button placeholder until mounted and exposes the accessible name `Switch to dark theme` or `Switch to light theme`.

- [ ] **Step 1: Add a failing Playwright theme contract**

Create the initial `e2e/theme.spec.ts` contract for the provider’s system-theme resolution:

```ts
await expect(page.locator("html")).toHaveClass(/light|dark/);
```

Run after a temporary `npm run build`: `npx playwright test e2e/theme.spec.ts`

Expected: FAIL because the starter page has no theme provider. The visible toggle contract is added after `SiteHeader` is mounted in Task 7.

- [ ] **Step 2: Implement the provider and hydration-safe toggle**

Use current next-themes guidance: `<html suppressHydrationWarning>`, a focused Client Component provider, `attribute="class"`, `defaultTheme="system"`, `enableSystem`, and `disableTransitionOnChange`. The toggle waits for mount before using `resolvedTheme` and keeps identical dimensions before/after hydration.

- [ ] **Step 3: Replace starter typography and metadata**

In `app/layout.tsx`, load Instrument Serif, Geist Sans, and Geist Mono through `next/font` CSS variables. Export static metadata with title `Berat Ercevik - Software Engineer`, a factual description, canonical social fields, and robots indexing. Keep the layout a Server Component and place the provider as deep as possible around `children`.

- [ ] **Step 4: Install the Chalk Slate token system**

Replace starter CSS with the exact Chalk Slate light/dark tokens retrieved from 21st.dev, then add centralized variables for:

```css
--portfolio-accent: #00d8ff;
--effect-prismatic-primary: ...;
--effect-prismatic-secondary: ...;
--effect-trail: var(--portfolio-accent);
--effect-spark: var(--portfolio-accent);
--effect-glow: var(--portfolio-accent);
```

Map all semantic tokens through Tailwind v4 `@theme inline`. Add global focus styles, `scroll-behavior`, selection colors, fixed effect-layer z-index roles, `overflow-x: clip`, and reduced-motion overrides. No component may add another concrete color.

- [ ] **Step 5: Add generated metadata images**

Use Next.js `ImageResponse` in `app/icon.tsx` and `app/opengraph-image.tsx` to render a minimal `BE` mark and a 1200x630 cyan-on-Chalk-Slate social card. Keep these Server Component metadata routes and use only supported flexbox CSS.

- [ ] **Step 6: Verify theme foundation**

Run:

```bash
npm run lint
npm run test
npm run build
npx playwright test e2e/theme.spec.ts
```

Expected: the production page receives a resolved theme class and exposes a working, named toggle.

### Task 5: Port the global React Bits-inspired effects

**Files:**
- Create: `components/effects/effect-stage.tsx`
- Create: `components/effects/prismatic-burst.tsx`
- Create: `components/effects/pixel-trail.tsx`
- Create: `components/effects/click-spark.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- `EffectStage()` owns capability listeners and renders effect children from one `EffectProfile`.
- `PrismaticBurst({ profile }: { profile: EffectProfile })` renders a decorative full-viewport canvas or static CSS fallback.
- `PixelTrail()` uses constants `{ interpolate: 2.7, maxAge: 300, gooStrength: 1, gridSize: 90 }` and resolves `--effect-trail` at runtime.
- `ClickSpark({ sparkCount = 6, sparkSize = 7 })` renders sparks for eligible pointer clicks only.

- [ ] **Step 1: Add effect lifecycle assertions to `e2e/responsive.spec.ts`**

The test must assert `data-effect-mode`, no pointer canvases under touch/reduced motion, and pointer canvases under fine-pointer desktop emulation.

- [ ] **Step 2: Implement a capability-aware `EffectStage`**

Use `matchMedia` listeners for the exact query constants, compute `getEffectProfile`, clean up every listener, and expose `data-effect-mode` for deterministic tests. Do not initialize pointer event handlers when `pointerEffects` is false. Mount `<EffectStage />` at the top of the existing `app/page.tsx` so this task’s browser contract is independently testable; Task 8 will replace the remaining starter markup.

- [ ] **Step 3: Implement Prismatic Burst**

Use one fixed, pointer-inert canvas. Resolve effect colors from `getComputedStyle(document.documentElement)`, generate deterministic particles from index-based seed math, animate only in mobile/enhanced profiles, cap device pixel ratio at 2, resize with cleanup, use 42 particles desktop and 18 mobile, and render a static CSS radial field in static mode.

- [ ] **Step 4: Implement Pixel Trail**

Use one fixed low-resolution canvas grid, pointer-move samples interpolated by 2.7, age samples at 300ms, draw square cells on the 90px grid, apply the requested goo-strength blur/composite treatment, and cancel RAF/listeners on cleanup. Add `data-effect="pixel-trail"` only when mounted.

- [ ] **Step 5: Implement Click Spark**

Listen only to `pointerdown` while eligible, create six short-lived radial sparks of size seven at the pointer location, animate transform/opacity rather than layout, remove completed sparks, and expose `data-effect="click-spark"`.

- [ ] **Step 6: Verify effect gating and cleanup**

Run unit tests, build, and the focused responsive Playwright file. Expected: desktop enhanced profile mounts all effects; 390px and reduced-motion contexts do not mount pointer effects; no page errors or console errors occur.

### Task 6: Port text effects and reusable presentation primitives

**Files:**
- Create: `components/effects/ascii-text.tsx`
- Create: `components/effects/scrambled-text.tsx`
- Create: `components/effects/warp-text.tsx`
- Create: `components/effects/trait-rotator.tsx`
- Create: `components/effects/border-glow.tsx`
- Create: `components/ui/portfolio-card.tsx`
- Create: `components/ui/section-heading.tsx`
- Create: `components/ui/external-link.tsx`

**Interfaces:**
- `AsciiText({ text, className }: { text: string; className?: string })` retains a screen-reader heading label.
- `ScrambledText({ text, chars?: string; className?: string })` defaults to `@#$%^` and never changes its accessible label.
- `WarpText({ text, as?: "span" | "div"; className?: string })` uses Motion transforms only when allowed.
- `TraitRotator({ traits }: { traits: readonly string[] })` shows the first trait statically under reduced motion.
- `PortfolioCard({ children, className })` composes `BorderGlow` and semantic surface styles.
- `ExternalLink` adds safe external target/rel behavior and an accessible external-link indicator.

- [ ] **Step 1: Implement accessible text-first fallbacks**

Each text effect renders stable semantic text before animation enhancement. Decorative glyph layers use `aria-hidden="true"`; animation never replaces the only accessible name.

- [ ] **Step 2: Implement restrained Motion enhancement**

Use `motion/react`, `useReducedMotion`, `whileInView`, motion values, and transform/opacity only. Scramble runs once on first intersection; Warp Text uses a short character wave rather than continuous distortion; Trait Rotator pauses when the tab is hidden and cleans its interval.

- [ ] **Step 3: Implement Border Glow and card shell**

Use CSS custom properties and pointer coordinates stored as CSS variables, not React state. The card remains visually complete without hover. Apply one consistent radius system and visible focus-within treatment.

- [ ] **Step 4: Run unit, lint, and build gates**

Run: `npm run test && npm run lint && npm run build`

Expected: no hydration, hook, TypeScript, or hardcoded-color errors.

### Task 7: Build site chrome and navigation

**Files:**
- Create: `components/chrome/site-header.tsx`
- Create: `components/chrome/bubble-menu.tsx`
- Create: `components/chrome/scroll-progress.tsx`
- Modify: `app/page.tsx`
- Modify: `e2e/theme.spec.ts`

**Interfaces:**
- `SiteHeader()` renders the `BE` home link and `ThemeToggle`.
- `BubbleMenu({ items }: { items: PortfolioContent["navigation"] })` exposes a button named `Open section navigation`, `aria-expanded`, Escape handling, focus return, and anchor links.
- `ScrollProgress()` uses `useScroll` and `scaleY` with `transform-origin: top`.

- [ ] **Step 1: Add failing navigation tests**

In `e2e/portfolio.spec.ts`, assert the menu opens by click and keyboard, every approved section link exists, clicking each anchor updates the hash and brings the target section into the viewport, Escape closes the menu, and focus returns to the trigger. Add the visible theme-toggle assertion to `e2e/theme.spec.ts`.

- [ ] **Step 2: Implement the top header**

Keep it visually light and fixed above content with only identity and theme control. Avoid duplicate navigation and duplicate CTA intent.

- [ ] **Step 3: Implement the Bubble Menu**

Render the collapsed bottom-center pill by default. On expansion, arrange seven labeled items without relying on hover; use Motion layout transforms, lock no scrolling, close after anchor selection, and provide a single-column/safe-area-aware mobile expansion.

- [ ] **Step 4: Implement right-edge progress**

Use `useScroll()` and a spring-smoothed `scaleY`; render static track semantics under reduced motion and hide the decorative control from assistive technology. Update `app/page.tsx` to mount `SiteHeader`, `BubbleMenu`, and `ScrollProgress`, plus temporary semantic target sections for every navigation ID; Task 8 replaces those targets with the finished section components.

- [ ] **Step 5: Confirm navigation GREEN**

Build and run `npx playwright test e2e/portfolio.spec.ts -g "navigation"`.

Expected: click, touch, keyboard, focus return, anchor positions, and hash updates pass.

### Task 8: Build the seven portfolio sections

**Files:**
- Create: `components/sections/hero.tsx`
- Create: `components/sections/about.tsx`
- Create: `components/sections/publications.tsx`
- Create: `components/sections/experience.tsx`
- Create: `components/sections/projects.tsx`
- Create: `components/sections/skills.tsx`
- Create: `components/sections/contact-footer.tsx`
- Create: `components/effects/skills-marquee.tsx`
- Replace: `app/page.tsx`

**Interfaces:**
- Each section receives only its typed content slice and owns the semantic element with its approved ID.
- `app/page.tsx` composes `EffectStage`, `SiteHeader`, all sections, `BubbleMenu`, and `ScrollProgress` in order.

- [ ] **Step 1: Add failing structure/content tests**

In `e2e/portfolio.spec.ts`, assert one `h1`, section IDs in exact order, exact paper titles/URLs, the four role titles, two project titles, every skill category, GitHub/LinkedIn/resume links, and no visible `mailto:` link.

- [ ] **Step 2: Implement Hero**

Use `AsciiText` for “Berat”, preserve an accessible `h1` for “Berat Ercevik”, use `ScrambledText` for the approved tagline, show `TraitRotator`, and render GitHub, LinkedIn, and resume CTAs. Keep headline and CTAs visible in the initial desktop and 390px mobile viewport.

- [ ] **Step 3: Implement About**

Render a first-person biography plus one Border Glow education card with UC Santa Cruz, B.S. Computer Science, Sep 2024-Dec 2026, 4.0/4.0, and coursework. Do not infer a personal location or graduation-status wording.

- [ ] **Step 4: Implement Publications**

Render two responsive Border Glow publication cards, each with a 16:10 `next/image` placeholder, exact title, venue/date, and canonical paper link. No author/contribution text is added.

- [ ] **Step 5: Implement Experience**

Render four role cards with dates, factual first-person summaries, and technologies. Use no invented employer for DSA Tutor, preserve BERTopic spelling, and avoid metric tiles/counters.

- [ ] **Step 6: Implement Projects**

Render Vitae and AI Discord Chatbot cards with descriptions and tags. Link only Vitae; leave the Discord project without a fake disabled or invented link.

- [ ] **Step 7: Implement Skills**

Render Languages, Tools, Frameworks, and Knowledge as two alternating chip rows on enhanced devices. Pause on hover/focus, expose all items in static DOM order, and disable continuous movement under reduced motion.

- [ ] **Step 8: Implement Contact/Footer**

Use one clear closing message and GitHub, LinkedIn, Resume links. Do not add an email form or duplicate a different contact CTA label.

- [ ] **Step 9: Compose the server page**

Replace the Create Next App page with the exact approved order. Keep static sections imported by the Server Component; pass serializable content slices into client leaves only.

- [ ] **Step 10: Run the focused content tests**

Run:

```bash
npm run test
npm run lint
npm run build
npx playwright test e2e/portfolio.spec.ts
```

Expected: exact content, order, links, and navigation pass.

### Task 9: Complete responsive, reduced-motion, and visual behavior

**Files:**
- Modify: `app/globals.css`
- Modify: section/effect files identified by Playwright failures
- Complete: `e2e/responsive.spec.ts`

**Interfaces:**
- Every multi-column section has an explicit `<768px` single-column fallback.
- `[data-effect-mode]` and effect data attributes remain stable test contracts.

- [ ] **Step 1: Add 390px layout assertions**

Use a 390x844 viewport and assert no horizontal overflow, hero CTA visibility, one-column section layouts, readable card widths, bottom safe-area clearance, and menu accessibility.

- [ ] **Step 2: Add reduced-motion assertions**

Emulate reduced motion and assert `data-effect-mode="static"`, no Pixel Trail/Click Spark canvases, no skills marquee animation, stable first trait, and all content visible.

- [ ] **Step 3: Add pointer-capability assertions**

Create touch/coarse-pointer and fine-pointer projects or contexts; assert pointer effects mount only for the fine-pointer case.

- [ ] **Step 4: Implement responsive fixes from failing tests**

Use mobile-first grid/flex rules, `min-height: 100dvh`, safe-area padding, capped text scales, and no `h-screen`. Continuous canvases must cap DPR and particle counts.

- [ ] **Step 5: Run responsive tests until GREEN**

Run: `npm run build && npx playwright test e2e/responsive.spec.ts`

Expected: all mobile, reduced-motion, and effect-gating cases pass without retries.

### Task 10: Complete visual and runtime Playwright verification

**Files:**
- Complete: `e2e/theme.spec.ts`
- Complete: `e2e/portfolio.spec.ts`
- Complete: `e2e/responsive.spec.ts`
- Create/update: `e2e/__screenshots__/*`

**Interfaces:**
- Screenshot tests use `data-test-effects="static"` or reduced-motion mode for deterministic output.
- Runtime collector fails on `console.error`, `pageerror`, and failed same-origin requests.

- [ ] **Step 1: Add a shared runtime-error collector**

Before navigation, attach listeners that collect console errors, uncaught page errors, and failed local requests; assert the arrays are empty after each flow. Do not whitelist effect errors.

- [ ] **Step 2: Add light and dark screenshot sweeps**

For each theme, capture:

```text
full-page
hero
about
publications
experience
projects
skills
contact
```

Freeze continuous effects for snapshots while keeping the correct static background and theme. Store Chromium baselines in the repository.

- [ ] **Step 3: Verify theme behavior**

Test system default in both emulated color schemes, toggle behavior, localStorage persistence after reload, stable theme class before screenshot, and no flash-visible mismatch.

- [ ] **Step 4: Verify links without inventing network guarantees**

Assert exact hrefs and local `/resume.pdf` response status/content type. For external destinations, verify canonical URL syntax in the browser suite; use direct HTTP smoke checks separately and report anti-bot responses rather than weakening assertions.

- [ ] **Step 5: Verify keyboard and semantics**

Tab through header, theme toggle, Bubble Menu, section links, and external links. Assert icon-only controls have names, focus is visible, one `h1` exists, decorative canvases are hidden, and animated text has stable accessible labels.

- [ ] **Step 6: Run and approve the complete browser matrix**

Run:

```bash
npm run build
npm run test:e2e
```

Expected: every interaction and screenshot test passes with zero console/page/local-request errors.

### Task 11: Add Netlify delivery and project documentation

**Files:**
- Create: `netlify.toml`
- Replace: `README.md`
- Remove: starter SVGs in `public/`
- Review: `.gitignore`

**Interfaces:**
- Netlify builds with `npm run build` and publishes through the supported Next.js adapter path.
- README documents content editing, tokens, effects, tests, and deployment.

- [ ] **Step 1: Add Netlify configuration**

Create:

```toml
[build]
  command = "npm run build"

[build.environment]
  NODE_VERSION = "22"
```

Rely on Netlify’s current Next.js detection rather than hardcoding `.next` as a static publish directory.

- [ ] **Step 2: Replace boilerplate documentation**

Document prerequisites, `npm install`, development, `npm run verify`, content editing in `data/content.ts`, color editing in `app/globals.css`, publication-placeholder replacement, resume replacement, Playwright screenshot updates, and Netlify deployment.

- [ ] **Step 3: Remove unused starter assets**

Delete `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, and `public/window.svg` after verifying no source references remain.

- [ ] **Step 4: Run documentation/config checks**

Run:

```bash
npm run lint
npm run test
npm run build
```

Expected: no stale asset imports or deployment configuration errors.

### Task 12: Final quality gates and real-browser acceptance

**Files:**
- Modify only files implicated by verification failures.

**Interfaces:**
- Completion evidence is fresh command output plus Playwright screenshots for both themes and mobile.

- [ ] **Step 1: Run design-taste and frontend-design preflight**

Check the approved design against anti-generic layout, content rhythm, color/shape consistency, motivated motion, mobile collapse, contrast, stable hero viewport, copy quality, and reduced-motion behavior. The approved spec explicitly overrides generic bans on the requested serif, Border Glow, and cursor effect.

- [ ] **Step 2: Run the full static gate**

Run:

```bash
npm run lint
npm run test
npm run build
```

Expected: zero lint errors, all Vitest tests passing, and a successful static production build.

- [ ] **Step 3: Launch and inspect with Next DevTools**

Start the app, use `nextjs_index`, then invoke the running server’s error and route tools. Expected: only `/` and Next internal not-found route, with no compilation/runtime errors.

- [ ] **Step 4: Run full Playwright verification**

Run `npm run test:e2e` and inspect generated light, dark, mobile, and per-section screenshots. Expected: zero failures, no runtime errors, no overflow, correct theme persistence, correct links, and approved section order.

- [ ] **Step 5: Run an interactive Playwright MCP smoke pass**

Open the production site in a real browser; toggle themes, open and traverse Bubble Menu, visit every section, exercise GitHub/LinkedIn/resume/paper links without losing the local verification tab, and capture final full-page screenshots in light/dark plus 390px mobile.

- [ ] **Step 6: Review the final diff against the spec**

Check every spec line has implementation evidence, run `git diff --check`, inspect `git status`, and report any intentionally uncommitted files. Do not claim completion unless all fresh verification evidence passes.
