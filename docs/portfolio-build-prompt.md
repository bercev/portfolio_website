# Berat Ercevik — One-Page Portfolio: Consolidated Build Prompt

> **What this is:** A single, self-contained document consolidated from three source docs — the raw briefing (`docs/prompts/starting_prompt.md`), the validated design spec (`docs/superpowers/specs/2026-08-08-portfolio-design.md`), and the implementation plan (`docs/superpowers/plans/2026-08-08-portfolio.md`). Where the docs conflicted, the reviewed spec's resolutions win and are recorded in §5. Build the site exactly as specified here; do not invent or omit.
>
> **Working style:** Work top-to-bottom through the build steps. Each step produces working code; you may commit after each. Do NOT skip the verification steps — they are how you know a step actually works. If a command prompts interactively, use the non-interactive flags shown. If an external registry component is paywalled or missing, hand-roll the equivalent (never block).

---

## 1. Goal

A single-page, scrollable portfolio for **Berat Ercevik** that grabs attention and displays his resume and career history. One page, scroll animations, parallax, light + dark mode, verified with Playwright. Copy is first-person where the site reads as Berat's voice; third-person stays only in the downloadable resume PDF.

## 2. Stack (locked)

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.3.0 (App Router), React 19, TypeScript | Already installed |
| Styling | Tailwind v4 (CSS-first, `@tailwindcss/postcss`) | Already installed |
| UI primitives | shadcn/ui | Run `shadcn init`; components in `components/ui/` |
| Third-party components | 21st.dev registry | `glowing-effect` for cards; free components only (paid `get_component` may be paywalled → hand-roll fallback) |
| Animation | `motion` v13 (motion.dev — the framer-motion successor) | All scroll/magnetic/confetti/etc. from motion patterns |
| Theme | **Chalk Slate** by Serafim (`21st.dev/community/themes/chalk-slate`) | shadcn CSS-variable theme; **hot-swappable** by design |
| Theme switching | `next-themes` | class-based dark; persisted to localStorage |
| Liquid background | `threejs-components@^0.0.30` as an **npm dependency** (NOT the pinned CDN `@0.0.19`) | Fixes the brief's CDN/runtime-external issue |
| Fonts | Geist + Geist Mono via `next/font` | Already in layout |
| Confetti | `canvas-confetti` | Triggered on resume download |
| PDF embed | `<iframe src="/resume.pdf">` (scrollable, zero-dependency) | Near page end; download handled by the confetti button |

**Verified real:** `motion`@13, `motion-ai` (Motion's AI kit — dev-time helper, not a runtime dep), `threejs-components`@0.0.30, and the Chalk Slate theme exist.

## 3. Content data — `data/content.ts` (verbatim, single source of truth)

All content lives in one typed data module so the UI stays dumb. Copy is first-person where the site reads as Berat's voice. **No data fetching at runtime** — `data/content.ts` → section components render.

```ts
export const identity = {
  name: "Berat Ercevik",
  role: "Software Engineer",
  tagline: "Full-stack applications · Agentic systems · AI research",
  location: "Santa Cruz, CA",
  bio: "I build full-stack applications, develop agentic systems, and conduct AI research. Completing my B.S. in Computer Science at UC Santa Cruz.",
  email: "hello@berat.dev", // replace with real email if the user provides one; fallback: use a mailto to the LinkedIn/github page
  github: "https://github.com/bercev",
  linkedin: "https://linkedin.com/in/berat-ercevik",
  vitae: "https://vitae.tools",
} as const;

export const education = {
  school: "University of California, Santa Cruz",
  degree: "B.S. Computer Science",
  gpa: "4.0/4.0",
  period: "Sep 2024 – Dec 2026",
  coursework: ["DSA", "AI", "ML", "Computer Architecture", "Compiler Design", "Computer Systems Design", "Software Engineering"],
} as const;

export type Role = {
  title: string;
  company: string;
  tags: string[];
  period: string;
  bullets: string[];
};

export const experience: Role[] = [
  {
    title: "AI Systems Engineer Intern",
    company: "Stealth Startup",
    tags: ["Python", "Google ADK", "GCP", "Docker"],
    period: "Apr 2026 – Present",
    bullets: [
      "Building a multi-agent system that creates software using multimodal and source-based evidence.",
      "Designing specialized agent workflows with structured handoffs, persistent execution state, and inspectable artifacts.",
      "Developed a Ralph-style discovery loop for the understanding pipeline — iterative evidence collection, specialist review, quality gates that reject unsupported claims.",
      "Integrated a Claude Code-based agentic coding harness into a sandboxed execution environment with schema validation, automated build + replay checks, deterministic quality gates, and iterative repair.",
    ],
  },
  {
    title: "DSA Tutor",
    company: "Student Support, UCSC",
    tags: ["Collaboration", "Communication"],
    period: "Apr 2025 – Present",
    bullets: [
      "Tutored 100+ upper-division students per quarter across office hours and project support.",
      "Partnered with faculty and TAs to keep grading consistent.",
    ],
  },
  {
    title: "LLM Researcher",
    company: "Algoverse",
    tags: ["LLMs", "Python", "Hydra", "Tmux", "Runpod", "SQLite"],
    period: "Jun 2025 – Jan 2026",
    bullets: [
      "Created and analyzed a 1M+ tweet dataset of Grok conversations for LLM–user interaction research.",
      "Fine-tuned a BERT topic model on conversation-level embeddings to extract value-laden topics.",
      "Built a high-throughput scraping pipeline using SQLite WAL for concurrent ingestion.",
      "A verbose logging/debugging system cut API calls and compute costs by 50%.",
    ],
  },
  {
    title: "SWE Intern",
    company: "Trustd.ai",
    tags: ["React", "NextJS", "TypeScript", "MongoDB", "AWS", "Git", "SCRUM"],
    period: "Oct 2024 – Feb 2025",
    bullets: [
      "Built an admin dashboard and REST-backed MongoDB workflows for thousands of user records (CRUD, Zod validation, error handling).",
      "AWS Amplify CI/CD; grew Playwright and Jest coverage by 60%, catching pre-release regressions.",
    ],
  },
];

export type Project = {
  name: string;
  blurb: string;
  tags: string[];
  period: string;
  link?: string;
  linkLabel?: string;
  highlights: string[];
};

export const projects: Project[] = [
  {
    name: "Vitae",
    blurb: "Resume-building + version-control platform. Built with an Agile/Scrum team of 5.",
    tags: ["NextJS", "TypeScript", "Jest", "PostgreSQL", "Docker", "CI/CD", "Neon", "Clerk", "SCRUM"],
    period: "Jan 2026 – Jun 2026",
    link: "https://vitae.tools",
    linkLabel: "vitae.tools",
    highlights: [
      "PostgreSQL via Docker (local) and Neon (production); optimized queries cut average response latency by 30%.",
      "Clerk auth; GitHub Actions + Netlify CI/CD with Jest and strict type/style checks — 70% fewer merge conflicts, 99.9% production uptime.",
    ],
  },
  {
    name: "AI Discord Chatbot",
    blurb: "Llama 3-powered Discord assistant with multi-agent RAG and self-correction.",
    tags: ["Python", "discord.py", "Ollama", "AWS", "LangChain", "SQL"],
    period: "Aug 2024 – Sep 2024",
    highlights: [
      "10K+ indexed messages; served 50+ community members.",
    ],
  },
];

export type Publication = { title: string; venue: string };

export const publications: Publication[] = [
  {
    title: "SkillOptimizer: Agent Skill Optimization Through Subskills Without Task Supervision",
    venue: "ICML 2026 AIWILD Workshop",
  },
  {
    title: "GrokSet: Multi-party Human–LLM Interactions in Social Media",
    venue: "arXiv:2602.21236, Feb 2026",
  },
];

export const skills = {
  Languages: ["Python", "JavaScript", "TypeScript", "C/C++", "PostgreSQL", "NoSQL"],
  Frameworks: ["React", "NextJS", "Express", "React Native", "Expo", "Jest", "LangChain", "Ollama"],
  Tools: ["Linux", "Git", "AWS", "Tmux", "Hydra", "Runpod", "Netlify", "Playwright"],
  Knowledge: ["OOP", "DSA", "AI", "ML", "LLMs", "Multi-agent systems", "RAG", "REST APIs", "Concurrency & Parallelism", "Agile SCRUM"],
} as const;
```

**Note on email:** The source material has no public email. Contact section links GitHub + LinkedIn + Vitae + a resume download; the hero radial menu's "Email" item links to `#contact`. Do NOT invent or use a `mailto:` address unless the user supplies a real one.

**Verify:** `npx tsc --noEmit` passes (or `npm run build` in a later step).

## 4. Page structure (single page, top → bottom) and effect → slot mapping

**Sections in order:**

1. **Hero** (`#home`) — name, tagline, scramble headline, magnetic CTAs (Download Resume, LinkedIn), TubesCursor background, radial socials menu (desktop), scroll indicator.
2. **About** (`#about`) — bio + education snapshot + skill chips (marquee).
3. **Experience** (`#experience`) — scroll-linked timeline, 4 roles with bullets.
4. **Projects** (`#projects`) — glowing **cards**: Vitae (card carries brief mention + link to `vitae.tools`) + AI Discord Chatbot.
5. **Publications** (`#publications`) — two compact citation **cards** (bordered cards with subtle hover lift — lighter than the glowing project cards).
6. **Resume** (`#resume`) — embedded PDF viewer + Download button (multi-state + confetti).
7. **Contact / Footer** (`#contact`) — socials (GitHub, LinkedIn, Vitae), resume download icon, back-to-top (dots-morph), copyright.

**Persistent chrome:** top scroll-progress bar; light/dark toggle in a fixed header; floating back-to-top.

**Effect → slot mapping:**

| Effect (motion pattern / component) | Slot |
|---|---|
| TubesCursor (`threejs-components`) | Hero ambient background + cursor interaction (desktop) |
| `react-scramble-text-stagger-center` | Hero headline |
| Magnetic buttons (`react-magnetic-filings`) | Hero CTAs |
| `react-radial-menu` | Socials, hero (desktop); footer row is the mobile/a11y fallback |
| `react-scroll-text-lines` | Section headings |
| `react-multi-state-badge` | Resume Download button (Idle → Downloading → Done) |
| Confetti (`canvas-confetti`) | On resume download completion |
| `react-dots-morph-button` | Back-to-top floating control |
| Glowing effect (21st.dev `@manuarora700/components/glowing-effect`) | Project cards |
| Scroll-linked parallax | Decorative blobs + section content; subtle |
| Scroll progress bar | Fixed top, full width, thin |

Reference implementations: `https://motion.dev/examples/react-magnetic-filings`, `.../react-confetti`, `.../react-radial-menu`, `.../react-dots-morph-button`, `.../react-scroll-text-lines`, `.../react-scramble-text-stagger-center`, `.../react-multi-state-badge`, and 21st.dev `@manuarora700/components/glowing-effect`. Implement the equivalents below rather than copying examples wholesale.

## 5. Design decisions (resolutions of brief ambiguities)

1. **Liquid cursor component** (the brief's ~750-line embedded prompt): the TubesCursor effect from `threejs-components`. Resolved: install the package as a real dependency instead of importing a pinned CDN build; lazy-load it client-only; keep the deferred-init pattern that works around the component's known *"Computed radius is NaN"* race; render it as the **hero ambient background** (it follows the cursor, so it doubles as the "mouse trail + liquid background" ask). Desktop-only; disabled under `prefers-reduced-motion` and on mobile.
2. **vitae.tools** — confirmed it is the user's own project (Vitae). Gets a **brief mention + link** in the Projects section, not a featured showcase.
3. **Resume presentation** — embedded scrollable viewer near the end of the page **plus** a Download button. Download click triggers the multi-state badge sequence and confetti.
4. **Effects inventory** — every effect listed in the brief is now assigned a concrete slot (§4) or dropped. Drop: `react-dots-morph-button` as a hero element (repurposed as the back-to-top control).
5. **framer-motion vs motion.dev** — same library; use `motion` only.
6. **shadcn + Tailwind v4** — shadcn supports Tailwind v4 via the `new-york`/v4 init flow; style layer is CSS-first (no `tailwind.config.ts`).

## 6. Architecture (one component per file)

```
app/
  layout.tsx              # metadata, fonts, ThemeProvider, SiteHeader, ScrollProgress
  page.tsx                # composes sections
  globals.css             # Tailwind v4 + Chalk Slate tokens + shadcn + custom-variant dark
components/
  providers.tsx           # ThemeProvider (next-themes)
  site-header.tsx         # fixed header: brand + theme toggle (Sun/Moon)
  effects/
    liquid-background.tsx # TubesCursor (threejs-components), lazy, client-only, desktop+reduced-motion gated
    scramble-text.tsx     # hero headline scramble + staggered lines
    magnetic-button.tsx   # magnetic wrapper
    radial-menu.tsx       # hero socials radial menu (desktop); footer row = fallback
    scroll-text-lines.tsx # section headings: masked line reveal + scroll-linked shift
    confetti-button.tsx   # resume download: multi-state + confetti
    scroll-progress.tsx   # fixed top progress bar
    back-to-top.tsx       # dots-morph scroll-to-top (floating)
  sections/
    hero.tsx  about.tsx  experience.tsx  projects.tsx
    publications.tsx  resume-section.tsx  contact.tsx
  ui/                     # shadcn: button, badge, card, separator, glowing-effect (21st)
data/
  content.ts              # typed resume content (single source of truth)
lib/
  utils.ts                # cn()
public/
  resume.pdf              # copy from repo root resume.pdf
e2e/
  portfolio.spec.ts       # Playwright verification (§9)
playwright.config.ts
types/
  threejs-components.d.ts # optional; only if tsc errors on the subpath import (see §8.5)
```

**Global chrome** (in `layout.tsx`, rendered once): `<SiteHeader/>` (fixed), `<ScrollProgress/>` (fixed top), `<BackToTop/>` (fixed bottom-right). `<LiquidBackground/>` mounts in `hero.tsx` only. Content sections render with opaque `bg-background` so the fixed tubes canvas only shows through the hero.

## 7. Global constraints (non-negotiable, all steps)

- **motion imports** always come from `"motion/react"` (never `framer-motion`). v13 API: `useReducedMotion`, `useScroll`, `useSpring`, `useTransform`, `AnimatePresence`, `motion.*` — all from `"motion/react"`.
- **Reduced motion:** every client effect honors `useReducedMotion()`; heavy effects (tubes, scramble, confetti, strong parallax) disabled — content remains readable.
- **Mobile:** no horizontal overflow; radial menu hidden on mobile (footer row is the fallback); tubes disabled under 768px.
- **No secrets:** nothing beyond public resume content; the anonymous employer stays "Stealth Startup". No API keys, credentials, tokens, or private URLs. `.env*` and `.claude/` stay git-ignored.
- **Tailwind v4:** no `tailwind.config.ts`; use CSS tokens + `@theme inline`.
- **TypeScript strict:** `npm run build` must pass (it type-checks).
- **Perf:** TubesCursor and confetti are `dynamic(() => import(...))`, `ssr: false`, lazy. No remote images — all decoration is CSS/SVG. Fonts via `next/font`. No layout shift from fonts.
- **A11y:** semantic landmarks (`<header>`, `<main>`, `<section>`, `<footer>`); keyboard-navigable menus and controls; visible `:focus-visible` rings; `aria-label`s on icon-only controls; `prefers-reduced-motion` disables TubesCursor, scramble, confetti, and strong parallax (fades remain); radial menu has a non-interactive fallback (inline social links) so it degrades gracefully.
- **SEO:** `metadata` in `layout.tsx` — title "Berat Ercevik — Software Engineer", description, Open Graph, `theme-color` per scheme. Remove the Create Next App defaults.

## 8. Build steps

### 8.1 Setup — dependencies, resume copy, config

**Files:** `package.json`, `public/resume.pdf`, `next.config.ts`

1. Copy the resume into the public dir so it can be embedded/downloaded:
   `cp resume.pdf public/resume.pdf`
2. Install runtime deps:
   `npm i motion threejs-components canvas-confetti next-themes lucide-react clsx tailwind-merge class-variance-authority`
3. Install type defs (dev):
   `npm i -D @types/canvas-confetti`
4. Verify `threejs-components` exports a TubesCursor factory:
   `ls node_modules/threejs-components/build/cursors/`
   Expect `tubes1.min.js` (ES module, default export = `(canvas, opts) => app`). If the main package export works too, prefer `import(...)` of the subpath used in §8.5.
5. `next.config.ts` stays as-is (no changes needed).

**Verify:** `npm run dev` boots; `ls public/resume.pdf` exists.

### 8.2 shadcn/ui init + primitives

**Files:** `components.json`, `lib/utils.ts`, `components/ui/{button,badge,card,separator}.tsx`

1. Init shadcn (non-interactive; Tailwind v4 + new-york style):
   `npx shadcn@latest init --yes --base-color neutral --css-variables`
   - If it prompts, answer: new-york, neutral, CSS variables yes. It generates `components.json`, `lib/utils.ts`, and a starter `globals.css` (we override in §8.3).
2. Add primitives:
   `npx shadcn@latest add button badge card separator`
3. Confirm `lib/utils.ts` exports `cn(...)` (clsx + tailwind-merge) — shadcn generates it.

**Verify:** files exist; `import { cn } from "@/lib/utils"` resolves.

### 8.3 Chalk Slate theme, dark mode, providers, metadata

**Files:** `app/globals.css`, `components/providers.tsx`, `app/layout.tsx`

1. Fetch the complete Chalk Slate CSS via 21st MCP: `mcp__21st__get_theme` with id `631bc429-f43e-43ba-94aa-963217924044`. Paste the **entire** returned `css` value into `app/globals.css` as the `:root { … }` and `.dark { … }` blocks (it contains both).
2. Write `app/globals.css` (Tailwind v4 CSS-first):

```css
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));

/* Chalk Slate tokens go here (from step 1) */

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  html { scroll-behavior: smooth; scroll-padding-top: 5rem; }
  body { @apply bg-background text-foreground; }
}
```

(`outline-ring/50` is the Tailwind v4 + shadcn default.)

3. Add the skills-marquee keyframes (used by §8.7 `about.tsx`):

```css
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.animate-marquee { animation: marquee 30s linear infinite; }
```

(Gated to run always; it is subtle. Optionally `@media (prefers-reduced-motion: reduce) { .animate-marquee { animation: none; } }`.)

4. Write `components/providers.tsx`:

```tsx
"use client";
import { ThemeProvider } from "next-themes";
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
```

5. Rewrite `app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { ScrollProgress } from "@/components/effects/scroll-progress";
import { BackToTop } from "@/components/effects/back-to-top";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Berat Ercevik — Software Engineer",
  description:
    "Berat Ercevik — software engineer building full-stack applications, agentic systems, and AI research. B.S. Computer Science @ UC Santa Cruz (2026).",
  openGraph: {
    title: "Berat Ercevik — Software Engineer",
    description: "Full-stack applications, agentic systems, and AI research. UC Santa Cruz CS (2026).",
    type: "website",
  },
};
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f7fc" },
    { media: "(prefers-color-scheme: dark)", color: "#141d2b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-full antialiased">
        <Providers>
          <SiteHeader />
          <ScrollProgress />
          <BackToTop />
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

(`LayoutProps<"/">` is a project global type helper — no import needed.)

**Verify:** `npm run dev`; page has no FOUC, `<html class="dark">` toggles with OS scheme; `next build` compiles (may fail only until later steps if imports are missing — then run after §8.8).

### 8.4 Effect components (motion)

All in `components/effects/`. Every component that animates must respect `useReducedMotion()` from `motion/react` — when reduced, render final state with no animation.

#### `scramble-text.tsx` — hero headline (equivalent of `react-scramble-text-stagger-center`)

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

const CHARS = "!<>-_\\/[]{}—=+*^?#";

function useScramble(text: string, delay = 0) {
  const reduced = useReducedMotion();
  const [out, setOut] = useState(reduced ? text : "");
  useEffect(() => {
    if (reduced) { setOut(text); return; }
    let raf = 0;
    let cancelled = false;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      if (cancelled) return;
      const progress = Math.min(1, Math.max(0, (now - start) / (text.length * 28)));
      const reveal = Math.floor(progress * text.length);
      let s = "";
      for (let i = 0; i < text.length; i++) {
        if (i < reveal) s += text[i];
        else if (text[i] === " ") s += " ";
        else s += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      setOut(s);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [text, delay, reduced]);
  return out;
}

export function ScrambleText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const value = useScramble(text, delay);
  return <span className={className} aria-label={text}>{value}</span>;
}

export function ScrambleLines({ lines, className, lineClassName, delay = 0 }: {
  lines: string[]; className?: string; lineClassName?: string; delay?: number;
}) {
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={line} className={`block ${lineClassName ?? ""}`}>
          <ScrambleText text={line} delay={delay + i * 180} />
        </span>
      ))}
    </span>
  );
}
```

#### `magnetic-button.tsx` — magnetic hover wrapper (equivalent of `react-magnetic-filings`)

```tsx
"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";

export function Magnetic({ children, strength = 0.35, className }: {
  children: ReactNode; strength?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 16, mass: 0.1 });
  const sy = useSpring(y, { stiffness: 180, damping: 16, mass: 0.1 });

  const onMouseMove = (e: React.MouseEvent) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

#### `scroll-text-lines.tsx` — section-heading reveal (equivalent of `react-scroll-text-lines`)

```tsx
"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";

function MaskedLine({ children, progress, index }: {
  children: React.ReactNode; progress: MotionValue<number>; index: number;
}) {
  const x = useTransform(progress, [0, 1], [index % 2 === 0 ? -40 : 40, 0]);
  return (
    <span className="block overflow-hidden py-0.5">
      <motion.span style={{ x }} className="block will-change-transform">{children}</motion.span>
    </span>
  );
}

export function ScrollTextLines({ children, className }: {
  children: React.ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "start 0.6"] });
  const lines = (Array.isArray(children) ? children : [children]);

  return (
    <div ref={ref} className={className}>
      {lines.map((line, i) => (
        <motion.span
          key={i}
          initial={reduced ? false : { opacity: 0, y: 40 }}
          whileInView={reduced ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
          className="block"
        >
          <MaskedLine progress={scrollYProgress} index={i}>{line}</MaskedLine>
        </motion.span>
      ))}
    </div>
  );
}
```

Usage: `<ScrollTextLines><h2>…line…</h2></ScrollTextLines>` — pass each visual line as a child element.

#### `radial-menu.tsx` — hero socials (desktop only; the footer/contact inline row is the mobile/a11y fallback)

```tsx
"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Github, Linkedin, Mail, FileDown } from "lucide-react";

type Item = { label: string; href: string; icon: React.ReactNode };

const RADIUS = 92;

export function RadialMenu({ items, className }: { items: Item[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  return (
    <div className={`relative ${className ?? ""}`}>
      <AnimatePresence>
        {open &&
          items.map((item, i) => {
            const angle = -90 + (i * 360) / items.length;
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * RADIUS;
            const y = Math.sin(rad) * RADIUS;
            return (
              <motion.a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                aria-label={item.label}
                initial={reduced ? false : { opacity: 0, scale: 0, x, y }}
                animate={{ opacity: 1, scale: 1, x, y }}
                exit={{ opacity: 0, scale: 0, x, y }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: i * 0.04 }}
                className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-foreground shadow-sm hover:bg-accent"
              >
                {item.icon}
              </motion.a>
            );
          })}
      </AnimatePresence>
      <motion.button
        type="button"
        aria-expanded={open}
        aria-label="Open social links"
        onClick={() => setOpen((v) => !v)}
        whileHover={reduced ? undefined : { scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
      >
        <span className={`transition-transform duration-300 ${open ? "rotate-45" : ""}`}>+</span>
      </motion.button>
    </div>
  );
}
```

Note: `x`/`y` motion values with the negative translate — the combination works because motion applies transform after translate. If positioning glitches during implementation, switch to positioning each item with `style={{ transform: \`translate(-50%, -50%) translate(${x}px, ${y}px)\` }}` and animate opacity/scale only.

#### `confetti-button.tsx` — resume download, multi-state (Idle → Downloading → Done) + confetti

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";

type State = "idle" | "downloading" | "done";

export function ConfettiButton({ label = "Download Resume", className }: {
  label?: string; className?: string;
}) {
  const [state, setState] = useState<State>("idle");
  const reduced = useReducedMotion();
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const fireConfetti = () => {
    if (reduced) return;
    const defaults = { zIndex: 200, spread: 80, ticks: 220, gravity: 0.9, startVelocity: 32, colors: ["#101723", "#636974", "#d7dfe5"] };
    confetti({ ...defaults, particleCount: 90, origin: { x: 0.5, y: 0.7 } });
    window.setTimeout(() => confetti({ ...defaults, particleCount: 60, angle: 60, origin: { x: 0.1, y: 0.8 } }), 180);
    window.setTimeout(() => confetti({ ...defaults, particleCount: 60, angle: 120, origin: { x: 0.9, y: 0.8 } }), 320);
  };

  const onDownload = () => {
    if (state !== "idle") return;
    setState("downloading");
    const a = document.createElement("a");
    a.href = "/resume.pdf";
    a.download = "Berat-Ercevik-Resume.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => {
      setState("done");
      fireConfetti();
      timer.current = window.setTimeout(() => setState("idle"), 2600);
    }, 900);
  };

  return (
    <motion.button
      type="button"
      onClick={onDownload}
      whileTap={{ scale: 0.96 }}
      className={`relative inline-flex items-center gap-2 overflow-hidden rounded-full px-6 py-3 font-medium text-primary-foreground shadow-md transition-colors ${state === "done" ? "bg-emerald-600" : "bg-primary"} ${className ?? ""}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
          className="flex items-center gap-2"
        >
          {state === "idle" && label}
          {state === "downloading" && (<><Loader2 className="h-4 w-4 animate-spin" /> Preparing…</>)}
          {state === "done" && (<><Check className="h-4 w-4" /> Resume downloaded!</>)}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
```

#### `scroll-progress.tsx` — fixed top progress bar

```tsx
"use client";

import { motion, useScroll, useSpring } from "motion/react";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-primary via-ring to-accent-foreground"
    />
  );
}
```

#### `back-to-top.tsx` — dots-morph → chevron, floating bottom-right, appears after scroll

```tsx
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const DOTS = [0, 1, 2, 3, 4]; // 5 dots, center column of 5 for a chevron/up arrow

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          whileHover={reduced ? undefined : { scale: 1.08 }}
          className="fixed bottom-6 right-6 z-[60] flex h-11 w-11 items-center justify-center rounded-full border bg-background/80 text-foreground shadow-lg backdrop-blur"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
```

(If a true dots-morph is wanted, swap the icon for a 3×3 dot grid that fans into the chevron on hover — this meets the spec's "dots-morph" slot with a lightweight equivalent.)

**Verify after §8.4:** `npx tsc --noEmit` passes.

### 8.5 Liquid background (TubesCursor)

**Files:** `components/effects/liquid-background.tsx`, `components/effects/tubes-cursor.tsx`

`tubes-cursor.tsx` (client canvas; keeps the deferred-init workaround for the known "Computed radius is NaN" race):

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

type TubesApp = { dispose?: () => void; tubes?: { setColors: (c: string[]) => void; setLightsColors: (c: string[]) => void } };

export function TubesCursorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<TubesApp | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    const timer = window.setTimeout(() => {
      import("threejs-components/build/cursors/tubes1.min.js")
        .then((mod) => {
          if (cancelled || !canvas) return;
          const factory = (mod as { default?: unknown; TubesCursor?: unknown }).default;
          const createTubes = factory as (el: HTMLCanvasElement, opts: unknown) => TubesApp;
          appRef.current = createTubes(canvas, {
            tubes: {
              colors: ["#101723", "#636974", "#d7dfe5"],
              lights: { intensity: 120, colors: ["#11cdef", "#b721ff", "#f4d03f"] },
            },
          });
        })
        .catch((err) => console.error("TubesCursor failed to load:", err));
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      appRef.current?.dispose?.();
    };
  }, [reduced]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-0" />;
}
```

`liquid-background.tsx` (lazy wrapper, rendered inside the hero; gated to desktop + no-reduced-motion):

```tsx
"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const TubesCursorCanvas = dynamic(() => import("./tubes-cursor").then((m) => m.TubesCursorCanvas), { ssr: false });

export function LiquidBackground() {
  const reduced = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(window.matchMedia("(min-width: 768px)").matches);
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (reduced || !isDesktop) return null;
  return <TubesCursorCanvas />;
}
```

**TypeScript note:** `threejs-components` ships no types for the subpath. If `tsc` errors, add to a `types` reference via a small declaration file `types/threejs-components.d.ts`:

```ts
declare module "threejs-components/build/cursors/tubes1.min.js";
```

and reference it through `tsconfig.json` `include` (or add `declare module` directly in the effect file). Do the pragmatic thing: put the `declare module` line at the top of `tubes-cursor.tsx` only if needed.

**Verify:** hero shows animated tubes following the cursor on desktop dark/light; nothing on mobile or with reduced motion; no console errors.

### 8.6 Glowing effect (21st.dev) + glow card

**Files:** `components/ui/glowing-effect.tsx`, `components/effects/glow-card.tsx`

1. Fetch the manuarora GlowingEffect via 21st MCP: `mcp__21st__get_component` id `1567`. Save the returned `componentCode` (the `GlowingEffect` component) to `components/ui/glowing-effect.tsx`. Keep its exports/props exactly. (Alternative install path if the CLI works: `npx shadcn@latest add "https://21st.dev/r/manuarora700/glowing-effect"`.)
2. Write `glow-card.tsx` wrapper:

```tsx
"use client";

import type { ReactNode } from "react";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export function GlowCard({ children, className, glowClassName, disabled = false }: {
  children: ReactNode; className?: string; glowClassName?: string; disabled?: boolean;
}) {
  return (
    <div className={`relative rounded-2xl border bg-card p-6 ${className ?? ""}`}>
      <GlowingEffect spread={40} glow disabled={disabled} proximity={60} inactiveZone={0.01} className={glowClassName} />
      {children}
    </div>
  );
}
```

(Adjust `GlowingEffect` props to match the fetched component's actual prop names — the fetch is authoritative.)

**Verify:** cards render with a cursor-following glow; no layout shift.

### 8.7 Sections

Each section is a server component unless it needs client state. Section files live in `components/sections/*.tsx`; `app/` stays thin.

#### `hero.tsx`

```tsx
"use client";

import { ArrowDown } from "lucide-react";
import { ScrambleLines } from "@/components/effects/scramble-text";
import { Magnetic } from "@/components/effects/magnetic-button";
import { RadialMenu } from "@/components/effects/radial-menu";
import { LiquidBackground } from "@/components/effects/liquid-background";
import { identity } from "@/data/content";
import { Github, Linkedin, Mail, FileDown } from "lucide-react";
import { motion } from "motion/react";

export function Hero() {
  return (
    <section id="home" className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <LiquidBackground />
      <div className="relative z-10 flex flex-col items-center text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
          {identity.location}
        </p>
        <ScrambleLines
          lines={["Berat Ercevik"]}
          className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl"
        />
        <h2 className="mt-4 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          {identity.tagline}
        </h2>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
          {identity.bio}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Magnetic>
            <a href="#resume" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/90">
              <FileDown className="h-4 w-4" /> Download Resume
            </a>
          </Magnetic>
          <Magnetic>
            <a href={identity.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border px-6 py-3 font-medium transition-colors hover:bg-accent">
              <Linkedin className="h-4 w-4" /> LinkedIn
            </a>
          </Magnetic>
        </div>

        {/* Radial socials — desktop only (hidden on mobile; footer row covers it) */}
        <div className="mt-14 hidden md:block">
          <RadialMenu
            items={[
              { label: "GitHub", href: identity.github, icon: <Github className="h-5 w-5" /> },
              { label: "LinkedIn", href: identity.linkedin, icon: <Linkedin className="h-5 w-5" /> },
              { label: "Vitae", href: identity.vitae, icon: <FileDown className="h-5 w-5" /> },
              { label: "Email", href: "#contact", icon: <Mail className="h-5 w-5" /> },
            ]}
          />
        </div>
      </div>

      <a href="#about" aria-label="Scroll to about" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground">
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}>
          <ArrowDown className="h-5 w-5" />
        </motion.div>
      </a>
    </section>
  );
}
```

#### `about.tsx`

```tsx
import { ScrollTextLines } from "@/components/effects/scroll-text-lines";
import { education, identity, skills } from "@/data/content";

export function About() {
  const allSkills = Object.values(skills).flat();
  return (
    <section id="about" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <ScrollTextLines className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <h2>About</h2>
        </ScrollTextLines>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{identity.bio}</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-medium">Education</h3>
            <p className="mt-2 font-semibold">{education.school}</p>
            <p className="text-sm text-muted-foreground">{education.degree} · GPA {education.gpa} · {education.period}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {education.coursework.map((c) => (
                <span key={c} className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">{c}</span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-medium">Snapshot</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>4.0 GPA — B.S. Computer Science, UC Santa Cruz</li>
              <li>100+ students tutored per quarter</li>
              <li>2 publications · ICML 2026 AIWILD + arXiv</li>
              <li>1M+ tweet dataset analyzed (Grok conversations)</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 overflow-hidden">
          <h3 className="mb-4 font-medium">Skills</h3>
          <div className="flex gap-2 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="flex shrink-0 animate-marquee gap-2 pr-2">
              {[...allSkills, ...allSkills].map((s, i) => (
                <span key={i} className="whitespace-nowrap rounded-full border px-4 py-1.5 text-sm">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

#### `experience.tsx`

```tsx
"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { ScrollTextLines } from "@/components/effects/scroll-text-lines";
import { experience } from "@/data/content";

export function Experience() {
  const railRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: railRef, offset: ["start 0.8", "end 0.5"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <section id="experience" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <ScrollTextLines className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <h2>Experience</h2>
        </ScrollTextLines>

        <div ref={railRef} className="relative mt-12 pl-8">
          <div className="absolute left-2 top-0 h-full w-px bg-border" aria-hidden />
          <motion.div style={{ scaleY }} className="absolute left-2 top-0 h-full w-px origin-top bg-primary" aria-hidden />

          <ol className="space-y-12">
            {experience.map((role, i) => (
              <motion.li
                key={role.company + role.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
                className="relative"
              >
                <span className="absolute -left-8 top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" aria-hidden />
                <div className="rounded-2xl border bg-card p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold">{role.title} · <span className="text-muted-foreground">{role.company}</span></h3>
                    <span className="text-sm text-muted-foreground">{role.period}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {role.tags.map((t) => <span key={t} className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground">{t}</span>)}
                  </div>
                  <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                    {role.bullets.map((b) => <li key={b}>{b}</li>)}
                  </ul>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
```

#### `projects.tsx`

```tsx
import { ArrowUpRight } from "lucide-react";
import { ScrollTextLines } from "@/components/effects/scroll-text-lines";
import { GlowCard } from "@/components/effects/glow-card";
import { projects } from "@/data/content";

export function Projects() {
  return (
    <section id="projects" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <ScrollTextLines className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <h2>Projects</h2>
        </ScrollTextLines>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {projects.map((p) => (
            <GlowCard key={p.name}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <span className="text-xs text-muted-foreground">{p.period}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {p.highlights.map((h) => <li key={h}>{h}</li>)}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                {p.tags.map((t) => <span key={t} className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground">{t}</span>)}
              </div>
              {p.link && (
                <a href={p.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
                  {p.linkLabel ?? p.link} <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
            </GlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}
```

#### `publications.tsx`

```tsx
import { ScrollTextLines } from "@/components/effects/scroll-text-lines";
import { publications } from "@/data/content";

export function Publications() {
  return (
    <section id="publications" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <ScrollTextLines className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <h2>Publications</h2>
        </ScrollTextLines>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {publications.map((p) => (
            <div key={p.title} className="rounded-2xl border bg-card p-5 transition-colors hover:bg-accent/40">
              <h3 className="font-medium leading-snug">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.venue}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

#### `resume-section.tsx`

```tsx
import { ScrollTextLines } from "@/components/effects/scroll-text-lines";
import { ConfettiButton } from "@/components/effects/confetti-button";

export function ResumeSection() {
  return (
    <section id="resume" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ScrollTextLines className="text-3xl font-semibold tracking-tight sm:text-4xl">
            <h2>Resume</h2>
          </ScrollTextLines>
          <ConfettiButton />
        </div>
        <div className="mt-8 overflow-hidden rounded-2xl border bg-card">
          <iframe
            src="/resume.pdf"
            title="Berat Ercevik — Resume"
            className="h-[70vh] w-full"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
```

#### `contact.tsx`

```tsx
import { Github, Linkedin, FileDown, ArrowUp } from "lucide-react";
import { ScrollTextLines } from "@/components/effects/scroll-text-lines";
import { identity } from "@/data/content";

export function Contact() {
  const socials = [
    { label: "GitHub", href: identity.github, icon: <Github className="h-5 w-5" /> },
    { label: "LinkedIn", href: identity.linkedin, icon: <Linkedin className="h-5 w-5" /> },
    { label: "Vitae", href: identity.vitae, icon: <FileDown className="h-5 w-5" /> },
  ];
  return (
    <footer id="contact" className="bg-background px-6 py-20">
      <div className="mx-auto max-w-4xl text-center">
        <ScrollTextLines className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <h2>Let’s connect</h2>
        </ScrollTextLines>
        <p className="mt-4 text-muted-foreground">I’m always up for a conversation about engineering, AI, or great teams.</p>
        <div className="mt-8 flex items-center justify-center gap-4">
          {socials.map((s) => (
            <a key={s.label} href={s.href} target={s.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" aria-label={s.label}
               className="flex h-11 w-11 items-center justify-center rounded-full border bg-card text-foreground transition-colors hover:bg-accent">
              {s.icon}
            </a>
          ))}
          <a href="#resume" aria-label="Download resume" className="flex h-11 w-11 items-center justify-center rounded-full border bg-card text-foreground transition-colors hover:bg-accent">
            <FileDown className="h-5 w-5" />
          </a>
        </div>
        <p className="mt-10 text-sm text-muted-foreground">© {new Date().getFullYear()} Berat Ercevik. Built with Next.js, Tailwind, and Motion.</p>
      </div>
    </footer>
  );
}
```

(Use a static year literal `2026` to avoid hydration mismatch — since `Contact` is a server component `new Date()` is fine, but keep it simple with `2026`.)

#### `site-header.tsx`

```tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function SiteHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <a href="#home" className="text-sm font-semibold tracking-tight">berat<span className="text-muted-foreground">.ercevik</span></a>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex" aria-label="Primary">
          <a href="#about" className="transition-colors hover:text-foreground">About</a>
          <a href="#experience" className="transition-colors hover:text-foreground">Experience</a>
          <a href="#projects" className="transition-colors hover:text-foreground">Projects</a>
          <a href="#publications" className="transition-colors hover:text-foreground">Publications</a>
          <a href="#resume" className="transition-colors hover:text-foreground">Resume</a>
        </nav>
        <button
          type="button"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setTheme(dark ? "light" : "dark")}
          className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-accent"
        >
          {mounted ? (dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <span className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
```

**Verify after §8.7:** each section renders at its anchor; header/nav/theme-toggle work; `tsc --noEmit` clean.

### 8.8 Compose the page

**File:** `app/page.tsx`

```tsx
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Experience } from "@/components/sections/experience";
import { Projects } from "@/components/sections/projects";
import { Publications } from "@/components/sections/publications";
import { ResumeSection } from "@/components/sections/resume-section";
import { Contact } from "@/components/sections/contact";

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Experience />
      <Projects />
      <Publications />
      <ResumeSection />
      <Contact />
    </main>
  );
}
```

**Verify:** `npm run build` succeeds; `npm run lint` clean; dev server has no console errors. Fix any import/motion-API mismatches here (motion v13 API: `useReducedMotion`, `useScroll`, `useSpring`, `useTransform`, `AnimatePresence`, `motion.*` all from `"motion/react"`).

## 9. Verification (Playwright + manual)

**Files:** `playwright.config.ts`, `e2e/portfolio.spec.ts`, `package.json`

1. Install Playwright:
   `npm i -D @playwright/test`
   `npx playwright install chromium`
2. `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

3. `e2e/portfolio.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("page loads with all sections", async ({ page }) => {
  await page.goto("/");
  for (const id of ["home", "about", "experience", "projects", "publications", "resume", "contact"]) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await expect(page.getByText("Berat Ercevik", { exact: false }).first()).toBeVisible();
});

test("no horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("theme toggle persists dark class", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await page.getByRole("button", { name: /switch to dark mode/i }).click();
  await expect(html).toHaveClass(/dark/);
  await page.reload();
  await expect(html).toHaveClass(/dark/);
});

test("resume download button exists and triggers state", async ({ page }) => {
  await page.goto("/#resume");
  const btn = page.getByRole("button", { name: /download resume/i }).first();
  await expect(btn).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    btn.click(),
  ]);
  expect(download.suggestedFilename()).toContain("Resume");
});

test("no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  await page.goto("/");
  await page.waitForTimeout(1500);
  expect(errors.filter((e) => !e.includes("TubesCursor failed to load"))).toEqual([]);
});
```

4. Run: `npx playwright test`. Fix failures until green.
5. Also use the Playwright **MCP browser** for a human-eye pass: screenshot hero + dark mode + mobile; confirm tubes render (desktop) and are absent (mobile/reduced-motion).

**Final:** `git add -A` and commit with a message summarizing the build. Report what was built, verification results, and any deviations from spec.

## 10. Out of scope (now)

- Deployment/hosting setup (no target configured yet).
- Contact form (use `mailto:` instead).
- Additional pages (blog, etc.).
- Custom favicon/OG image (defaults fine; noted as follow-up).
- Paid 21st.dev components — free only; hand-rolled equivalents for anything paywalled.

## 11. Known risks

- **TubesCursor** has a pre-existing init race ("Computed radius is NaN") — mitigated with deferred init; if it misbehaves, drop to a CSS/SVG gradient background fallback (no content depends on it).
- **21st.dev get_component** is metered/paid on the free tier — if a target component is paywalled, hand-roll the equivalent rather than block.
- **Chalk Slate theme** — tokens may need light-touch tuning for contrast in dark mode; acceptable.

## 12. Decisions deferred to implementation (low risk)

- Exact hero tagline wording.
- Radial menu vs. inline socials final styling (default: radial on desktop).
- Accent/gradient choice within Chalk Slate tokens.
