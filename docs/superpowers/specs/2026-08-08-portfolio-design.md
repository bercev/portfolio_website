# Design Spec — Berat Ercevik One-Page Portfolio

**Date:** 2026-08-08
**Status:** Approved (design) — **do not build yet** (awaiting implementation plan)
**Source brief:** `docs/prompts/starting_prompt.md`
**Branch:** `gpt` — fresh start; supersedes the previously deleted spec of this name

---

## 1. Vision

Creative but tasteful. A one-page portfolio that grabs attention without noise. **Mobile-first is a hard requirement** — every effect must degrade gracefully on touch devices.

## 2. Stack

- Next.js 16.3.0 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4
- shadcn/ui for primitives; `motion` v13 for animation
- react-bits components (from the brief's reactbits.dev URLs) — ported into `components/`, each effect in its own file
- `next-themes` for light/dark (class strategy)
- Context7 MCP for research; Playwright MCP for verification
- **Deploy: Netlify**

## 3. Theme & color

- **Chalk Slate** by Serafim (21st.dev) — light + dark CSS-variable theme
- Default follows **system**; single light/dark toggle in header, persisted
- **Color editability (priority):** all colors (theme tokens + cyan accent + effect colors) centralized as CSS variables in one place (`globals.css`). Components reference vars — never hardcoded hex. Change one var → reskin the whole site.
- **Accent: cyan `#00d8ff`** (ties to the pixel-trail cursor). Prismatic-burst background recolored to cyan tones — dark mode = navy field with cyan gradients, light mode = soft/airier.

## 4. Effects — each has one job

| Effect | Source | Placement |
|---|---|---|
| ascii-text | reactbits | Hero name "Berat" |
| scrambled-text | reactbits | Hero tagline / secondary text |
| warp-text | reactbits | Section headings / trait line |
| border-glow | reactbits | All cards |
| click-spark | reactbits | Click effect (desktop-only) |
| prismatic-burst | reactbits | Page background, cyan recolor |
| pixel-trail | reactbits | Cursor trail — **exact URL settings:** interpolate=2.7, maxAge=300, gooStrength=1, color=00d8ff, gridSize=90 (desktop-only) |
| bubble-menu | reactbits | Nav — **bottom-center pill**, tap-to-expand on mobile |
| scroll-progress | custom | **Vertical bar, right edge** |

## 5. Device gating & accessibility

- Mouse effects (pixel-trail, click-spark): only under `@media (hover: hover) and (pointer: fine)` — hidden on touch.
- prismatic-burst: throttled particle count on mobile.
- `prefers-reduced-motion`: continuous animation degrades to static/fade only.

## 6. Typography

- Display: serif (Fraunces vs Instrument Serif — TBD)
- Body: Chalk Slate sans (system stack)
- Labels/eyebrows: mono

## 7. Sections (order)

1. **Hero** — ascii "Berat", tagline, first-person bio, **rotating character-trait line** (warp/scrambled), GitHub + LinkedIn (**no Vitae link**), resume download
2. **About** — fuller bio + education (B.S. CS @ UCSC, 4.0)
3. **Publications** — cards with **screenshot preview (placeholder — user adds later)**; only papers get image previews
4. **Experience** — role cards, text/tags/links only
5. **Projects** — cards, text/tags/links only
6. **Skills** — rotating/sliding chips
7. **Contact/Footer** — links + resume

## 8. Content architecture

- Single typed data module `data/content.ts` (source of truth; user-editable)
- First-person voice
- **No numeric proof points** — character traits instead (rotating hero line)

## 9. Verification (Playwright — full sweep)

- Full-page + per-section screenshots in **both** light & dark
- Theme toggle works, persists, no flash-of-wrong-theme
- bubble-menu anchors scroll to sections
- Mobile viewport 390px: renders clean, effects gated
- No console errors
- GitHub / LinkedIn / resume / paper links resolve

## 10. Open items (decide during build)

- Serif display font (Fraunces vs Instrument Serif)
- Hero tagline copy
- Character-trait words
