# CLAUDE.md

Personal one-page portfolio for Berat Ercevik.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4 (CSS-first config via `app/globals.css`, no `tailwind.config`)
- Motion (`motion` package) + GSAP + `ogl` for WebGL effects
- `next-themes` for system-aware light/dark themes
- `canvas-confetti` for the resume-download celebration

## Commands

- `npm run dev` — dev server at http://localhost:3000
- `npm run lint` / `npx eslint .` — lint
- `npm run test` — Vitest unit tests
- `npm run test:e2e` — Playwright visual-regression / e2e tests
- `npx playwright install chromium` — needed once for e2e

## Structure

- `app/` — layout, page, global styles, OG image
- `components/effects/` — visual effects (Acid Squares background, hero particle text, pixel cards, target cursor, click spark, curved skills loop, etc.)
- `components/sections/` — page sections (hero, about, experience, projects, publications, skills, contact-footer)
- `lib/` — content data (`content.ts`), effect policy/reduced-motion gating, theme palette logic
- `e2e/` — Playwright specs; deterministic visual regression is a project goal
- `docs/` — design docs (e.g. interactive PDF previews)

## Conventions

- Conventional commits with scopes, e.g. `feat(effects): ...`, `fix(navigation): ...`, `style(portfolio): ...`
- Effects must respect reduced motion (`lib/use-hydrated-reduced-motion.ts`, `lib/effect-policy.ts`) and stay visible/work in both light and dark themes
- Theme resolution happens only through `components/providers/theme-provider.tsx`; do not add another theme resolver or use a fixed CSP nonce (see README "Theme bootstrap and strict CSP")
- Do not delete files or artifacts — unused starter assets in `public/assets/icons/` are intentionally retained per user directive
- Deploy target is Netlify (Node 22); keep static rendering unless necessary

## Testing expectations

Unit-test pure logic in `lib/` and effect helpers (Vitest colocated `*.test.ts`). Visual/e2e coverage lives in Playwright; keep screenshots deterministic when changing effects or sections.
