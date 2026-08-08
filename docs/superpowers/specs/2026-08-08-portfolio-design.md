# Berat Ercevik — One-Page Portfolio: Design Spec

**Date:** 2026-08-08
**Status:** Approved (design), pending spec review
**Supersedes / source brief:** `docs/prompts/starting_prompt.md` (the raw brief, preserved at that path — consult it for the full original requirements and motion effect examples)

This document is the validated, buildable spec derived from the source brief `docs/prompts/starting_prompt.md`. It resolves the ambiguities in the brief and is the single source of truth for implementation. Build work must not begin until this spec passes review.

---

## 1. Goal

A single-page, scrollable portfolio for **Berat Ercevik** that grabs attention and displays his resume and career history. One page, scroll animations, parallax, light + dark mode, verified with Playwright.

## 2. Content (sourced from `resume.pdf`, GitHub, LinkedIn)

All content lives in one typed data module (`data/content.ts`) so the UI stays dumb. Copy is first-person where the site reads as Berat's voice; third-person stays only in the downloadable resume PDF itself.

### Identity
- **Name:** Berat Ercevik
- **Tagline:** Software engineer — full-stack applications, agentic systems, AI research. B.S. Computer Science @ UC Santa Cruz (2026).
- **Bio (site, first-person):** I build full-stack applications, develop agentic systems, and conduct AI research. Completing my B.S. in Computer Science at UC Santa Cruz.
- **Links:** GitHub `github.com/bercev` · LinkedIn `linkedin.com/in/berat-ercevik` · Vitae `vitae.tools` (brief mention — it is the Vitae project below)

### Education
University of California, Santa Cruz — B.S. Computer Science, GPA 4.0/4.0, Sep 2024 – Dec 2026.
Coursework: DSA, AI, ML, Computer Architecture, Compiler Design, Computer Systems Design, Software Engineering.

### Experience (4 roles, most-recent-first)
1. **AI Systems Engineer Intern — Stealth Startup** (Python, Google ADK, GCP, Docker) · Apr 2026 – Present
   - Multi-agent system that creates software using multimodal and source-based evidence.
   - Specialized agent workflows: structured handoffs, persistent execution state, inspectable artifacts.
   - Ralph-style discovery loop for the understanding pipeline — iterative evidence collection, specialist review, quality gates that reject unsupported claims before producing the final structured spec.
   - Integrated a Claude Code-based agentic coding harness into a sandboxed execution environment: schema validation, automated build + replay checks, deterministic quality gates, iterative repair until acceptance criteria are met.
2. **DSA Tutor — Student Support, UCSC** (Collaboration, Communication) · Apr 2025 – Present
   - Tutored 100+ upper-division students per quarter (office hours + project support).
   - Partner with faculty and TAs on grading consistency.
3. **LLM Researcher — Algoverse** (LLMs, Python, Hydra, Tmux, Runpod, SQLite) · Jun 2025 – Jan 2026
   - Created and analyzed a 1M+ tweet dataset of Grok conversations for LLM–user interaction research.
   - Fine-tuned a BERT topic model on conversation-level embeddings to extract value-laden topics.
   - Built a high-throughput scraping pipeline using SQLite WAL for concurrent ingestion.
   - Verbose logging/debugging system cut API calls and compute costs by 50%.
4. **SWE Intern — Trustd.ai** (React, NextJS, TypeScript, MongoDB, AWS, Git, SCRUM) · Oct 2024 – Feb 2025
   - Admin dashboard and REST-backed MongoDB workflows for thousands of user records (CRUD, Zod validation, error handling).
   - AWS Amplify CI/CD; grew Playwright and Jest coverage by 60%, catching pre-release regressions.

### Projects
1. **Vitae** (→ `https://vitae.tools/`, brief mention) · NextJS, TypeScript, Jest, PostgreSQL, Docker, CI/CD, Neon, Clerk, SCRUM · Jan 2026 – Jun 2026
   - Resume-building + version-control platform, built in an Agile/Scrum team of 5.
   - PostgreSQL via Docker (local) and Neon (production); optimized queries cut average response latency by 30%.
   - Clerk auth; GitHub Actions + Netlify CI/CD with Jest and strict type/style checks — 70% fewer merge conflicts, 99.9% production uptime.
2. **AI Discord Chatbot** · Python, discord.py, Ollama, AWS, LangChain, SQL · Aug 2024 – Sep 2024
   - Llama 3-powered Discord assistant with multi-agent RAG and self-correction.
   - 10K+ indexed messages; served 50+ community members.

### Publications
1. *SkillOptimizer: Agent Skill Optimization Through Subskills Without Task Supervision* — ICML 2026 AIWILD Workshop.
2. *GrokSet: Multi-party Human–LLM Interactions in Social Media* — arXiv:2602.21236, Feb 2026.

### Technical Skills (chips/marquee)
- **Languages:** Python, JavaScript, TypeScript, C/C++, PostgreSQL, NoSQL
- **Frameworks:** React, NextJS, Express, React Native, Expo, Jest, LangChain, Ollama
- **Tools:** Linux, Git, AWS, Tmux, Hydra, Runpod, Netlify, Playwright
- **Knowledge:** OOP, DSA, AI, ML, LLMs, Multi-agent systems, RAG, REST APIs, Concurrency & Parallelism, Agile SCRUM

### Privacy & data safety
No secrets or non-public data are used anywhere in the site or this spec. Everything is public-facing resume content the owner provided. The anonymous employer stays anonymized as "Stealth Startup". No API keys, credentials, tokens, or private URLs are referenced; `.env*` and `.claude/` are git-ignored so local config never gets committed.

## 3. Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.3.0 (App Router), React 19, TypeScript | Already installed |
| Styling | Tailwind v4 (CSS-first, `@tailwindcss/postcss`) | Already installed |
| UI primitives | shadcn/ui | Run `shadcn init`; components in `components/ui/` |
| Third-party components | 21st.dev registry | `glowing-effect` for cards; free components only (paid get_component may be paywalled → hand-roll fallback) |
| Animation | `motion` v13 (motion.dev; the framer-motion successor) | All scroll/magnetic/confetti/etc. from motion patterns |
| Theme | **Chalk Slate** by Serafim (`21st.dev/community/themes/chalk-slate`) | shadcn CSS-variable theme; **hot-swappable** by design |
| Theme switching | `next-themes` | class-based dark; persisted to localStorage |
| Liquid background | `threejs-components@^0.0.30` as a **npm dependency** (NOT the pinned CDN `@0.0.19`) | Fixes the brief's CDN/runtime-external issue |
| Fonts | Geist + Geist Mono via `next/font` | Already in layout |
| Confetti | `canvas-confetti` | Triggered on resume download |
| PDF embed | `<iframe src="/resume.pdf">` (scrollable, zero-dependency) | Near page end; download handled by the confetti button |

**Verified real:** `motion`@13, `motion-ai` (Motion's AI kit — dev-time helper, not a runtime dep), `threejs-components`@0.0.30, and the Chalk Slate theme exist.

## 4. Design decisions (resolutions of brief issues)

1. **Liquid cursor component** (`prompts/starting_prompt.md` ~750-line embedded prompt): the TubesCursor effect from `threejs-components`. Resolved: install the package as a real dependency instead of importing a pinned CDN build; lazy-load it client-only; keep the deferred-init pattern that works around the component's known *"Computed radius is NaN"* race; render it as the **hero ambient background** (it follows the cursor, so it doubles as the "mouse trail + liquid background" ask). Desktop-only; disabled under `prefers-reduced-motion` and on mobile.
2. **vitae.tools** — confirmed it is the user's own project (Vitae). Gets a **brief mention + link** in the Projects section, not a featured showcase.
3. **Resume presentation** — embedded scrollable viewer near the end of the page **plus** a Download button. Download click triggers the multi-state badge sequence and confetti.
4. **Effects inventory** — the brief listed many motion examples with several unmapped ("no idea", "for idk something"). Every effect is now assigned a concrete slot (see §6) or dropped. Drop: `react-dots-morph-button` as a hero element (repurposed as the back-to-top control).
5. **framer-motion vs motion.dev** — same library; the spec uses `motion` only.
6. **shadcn + Tailwind v4** — shadcn supports Tailwind v4 via the `new-york`/v4 init flow; style layer is CSS-first (no `tailwind.config.ts`).

## 5. Page structure (single page, top → bottom)

1. **Hero** — name, tagline, scramble headline, magnetic CTAs (Download Resume, LinkedIn), TubesCursor background, radial socials menu (desktop), scroll indicator.
2. **About** — bio + education snapshot + skill chips (marquee).
3. **Experience** — scroll-linked timeline, 4 roles with bullets.
4. **Projects** — glowing **cards**: Vitae (the card carries the brief mention + link to `vitae.tools`) + AI Discord Chatbot.
5. **Publications** — two compact citation **cards** (bordered cards with subtle hover lift — lighter than the glowing project cards).
6. **Resume** — embedded PDF viewer + Download button (multi-state + confetti).
7. **Contact / Footer** — socials (GitHub, LinkedIn, mailto), back-to-top (dots-morph), copyright.

Persistent chrome: top scroll-progress bar; light/dark toggle in a fixed header; floating back-to-top.

## 6. Effect → slot mapping

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

## 7. Component architecture (one component per file)

```
app/
  layout.tsx              # metadata, fonts, ThemeProvider, global chrome
  page.tsx                # composes sections in order
  globals.css             # Tailwind v4 + Chalk Slate theme tokens + shadcn
components/
  providers.tsx           # ThemeProvider (next-themes) + MotionConfig
  effects/
    liquid-background.tsx # lazy TubesCursor wrapper
    scramble-text.tsx
    magnetic-button.tsx
    radial-menu.tsx
    scroll-text-lines.tsx
    confetti-button.tsx   # multi-state + confetti
    glow-card.tsx         # 21st glowing-effect wrapper
    scroll-progress.tsx
    back-to-top.tsx
  sections/
    hero.tsx  about.tsx  experience.tsx
    projects.tsx  publications.tsx  resume-section.tsx  contact.tsx
  ui/                     # shadcn primitives: button, badge, card, separator
data/
  content.ts              # typed resume content (single source of truth)
lib/
  utils.ts                # cn()
public/
  resume.pdf
```

Data flow: `data/content.ts` → section components render. No data fetching at runtime.

## 8. Performance, a11y, SEO

- **Perf:** TubesCursor and confetti are `dynamic(() => import(...))`, `ssr: false`, lazy. No remote images — all decoration is CSS/SVG. Fonts via `next/font`. No layout shift from fonts.
- **A11y:** semantic landmarks (`<header>`, `<main>`, `<section>`, `<footer>`); keyboard-navigable menus and controls; visible `:focus-visible` rings; `aria-label`s on icon-only controls; **`prefers-reduced-motion` disables TubesCursor, scramble, confetti, and strong parallax** (fades remain); radial menu has a non-interactive fallback (inline social links) so it degrades gracefully.
- **SEO:** `metadata` in `layout.tsx` — title "Berat Ercevik — Software Engineer", description, Open Graph, `theme-color` per scheme. Remove the Create Next App defaults.

## 9. Verification (Playwright + manual)

1. `npm run build` passes; `npm run lint` clean.
2. Dev server boots with no console errors or warnings.
3. Light and dark themes render correctly; toggle persists across reload.
4. Resume download → multi-state button completes → confetti fires.
5. Embedded resume viewer renders and is scrollable.
6. Mobile viewport (375px): all sections present, no horizontal overflow; radial menu falls back to inline socials; TubesCursor absent.
7. Tab order reaches every control; focus rings visible.
8. Reduced-motion emulation: heavy effects disabled, content still readable.
9. Smooth scroll anchors work (hero → sections).

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
