# Portfolio Signal Spine Revision Design

**Date:** 2026-08-14
**Status:** Approved
**Builds on:** `docs/superpowers/specs/2026-08-14-portfolio-creative-redesign.md`

## Goal

Strengthen the portfolio’s visual coherence and originality by unifying its shape language, restoring reliable ASCII visibility, giving both projects a controlled chromatic treatment, introducing a replayable scroll-linked signal spine, and increasing the editorial type scale without compromising mobile behavior, accessibility, reduced motion, or performance.

## Design read

This is a developer portfolio for recruiters, collaborators, and technically literate visitors. It should feel editorial and experimental rather than templated, with the ASCII name as the primary signature and a new chromatic signal spine as a supporting motion system. The redesign must avoid familiar purple AI gradients and generic terminal decoration.

## Confirmed decisions

- Every visible container and control uses a restrained rounded-rectangle language with a shared 6px radius.
- Circular geometry is reserved for icon-only controls.
- The new motion concept is the Signal Spine.
- Both projects render as chroma-effect cards in an asymmetric desktop pair and stack full-width on mobile.
- Chroma uses a controlled cyan, emerald, amber, and coral spectrum. Violet and purple are excluded.
- Typography adopts an editorial-large scale across the page, with especially prominent Experience and Education content.
- Animation behavior is hybrid: the signal remains continuously scroll-linked, while heading and card-entry effects replay on viewport re-entry from either direction.
- Mobile retains a simplified signal and heading replay. Reduced-motion mode remains static.
- The ASCII name uses high-contrast foreground glyphs with restrained chromatic highlights.

## Visual system

### Shape language

Define one 6px radius token in `app/globals.css` and derive visible component radii from it. Apply it consistently to:

- Bubble Menu trigger, panel, and navigation links
- Primary and secondary actions
- Contact profile links
- Skills tags
- Project cards
- Publication media containers
- Other visible bordered content surfaces

Icon-only controls may remain circular when the circle communicates the compact control affordance. Decorative sparks and particle primitives are not content containers and are exempt.

### Chroma palette

Add hand-editable effect tokens for:

- cyan `#00d8ff`
- emerald `#20d98b`
- amber `#ffbf3f`
- coral `#ff6b57`

The palette appears only in signature effects: the ASCII highlights, Signal Spine, and project-card edges. Card surfaces, page backgrounds, body text, and structural borders continue to use the Chalk Slate theme tokens. Chroma must not become a broad page gradient or reduce text contrast.

### ASCII visibility

The current ASCII scene draws text using the theme foreground color before luminance conversion. In light mode, dark text maps toward the blank end of the glyph ramp, producing weak or invisible output. Separate the source mask from the visible glyph palette:

- Render the text texture with a theme-independent high-luminance mask token.
- Continue converting WebGL output through the existing luminance-to-glyph pipeline.
- Style the resulting glyphs primarily with the theme foreground color.
- Add restrained cyan, emerald, amber, and coral highlights without allowing transparent or low-contrast regions to erase the letterform.
- Preserve the semantic screen-reader name and static Archivo fallback.

The full `BERAT` ASCII treatment must remain readable in light and dark at 1280x720 and 390x844.

## Projects

Render exactly two project cards:

1. Vitae as the wider featured card.
2. AI Discord Chatbot as the narrower supporting card.

Both cards use the same chromatic edge system and neutral card surface. The desktop grid is intentionally asymmetric; mobile stacks both cards at full width. Preserve existing titles, dates, descriptions, technologies, and canonical link ownership. AI Discord Chatbot remains unlinked.

The chroma treatment has two restrained behaviors:

- A brief spectral edge sweep when the card re-enters the viewport.
- Fine-pointer tracking that shifts the local glow along the edge during hover.

Neither behavior may reduce text contrast, obscure focus indication, or continuously animate under reduced motion.

## Signal Spine motion system

Replace the current plain scroll-progress bar with a narrow chromatic signal spine positioned along the viewport edge. The spine:

- maps continuously to document scroll progress through Motion values and a spring;
- transitions through cyan, emerald, amber, and coral without violet;
- remains noninteractive and does not cover content;
- uses transform-based animation rather than layout-changing properties;
- has a static token-colored reduced-motion presentation.

When a section crosses the active signal region:

- its heading performs a short character ripple;
- chroma-enabled cards perform one edge sweep;
- the effect resets after the section exits enough of the viewport and replays when it re-enters from either direction.

`WarpText` must no longer use one-time viewport animation. Re-entry behavior must avoid rapid flicker around the threshold and must not hide semantic text. Content remains present even before animation begins.

### Mobile behavior

Mobile retains:

- the scroll-linked signal;
- lightweight heading replay;
- static chroma card edges plus a short entry sweep.

Mobile removes:

- pointer tracking;
- blur-heavy glow layers;
- large parallax or depth transforms.

### Reduced motion

When `prefers-reduced-motion: reduce` is active:

- the signal is static;
- heading characters render fully visible without transition;
- project-card chroma edges render as a stable border treatment;
- ASCII renders one deterministic frame;
- Skills remains static;
- no continuous scroll-linked or pointer animation runs.

## Typography and spacing

Increase typography as a coherent system rather than enlarging isolated labels:

- Increase default supporting copy and metadata by one meaningful scale step.
- Make Experience roles prominent editorial headings.
- Make the Education institution and degree a major composition rather than a small sidebar detail.
- Increase project supporting copy and technology metadata where needed.
- Preserve a clear distinction between display headings, body text, and metadata through weight, line height, and spacing rather than tiny text.
- Use responsive `clamp()` values or breakpoint-aware utilities so large type wraps deliberately at 390px without horizontal overflow.
- Retain Archivo for all visible non-ASCII typography and Geist Mono only for aligned ASCII output.

## Component architecture

### Chroma card

Evolve the existing glow implementation into a focused chroma-card effect component that owns:

- spectral border rendering;
- pointer-local glow on capable desktop clients;
- viewport-entry sweep state;
- reduced-motion fallback;
- resource and listener cleanup.

`PortfolioCard` remains the project layout wrapper and exposes a stable `data-portfolio-card` marker. Projects must render exactly two wrappers.

### Signal spine

Extend or replace `components/chrome/scroll-progress.tsx` rather than adding a second global progress layer. Keep it as an isolated Client Component and derive visual transforms directly from Motion values.

### Replayable headings

Keep heading animation inside `WarpText`. Change its viewport lifecycle from one-time reveal to replayable entry while preserving stable semantic text and deterministic reduced-motion output.

### Tokens

All radius, chroma, contrast, and effect colors live in `app/globals.css`. Components must not hardcode color literals.

## Accessibility and resilience

- Preserve one semantic H1 and the existing section-heading hierarchy.
- Preserve keyboard navigation, visible focus, Bubble Menu Escape behavior, canonical destinations, and Contact link ownership.
- Keep all interactive targets at least 44px tall.
- Do not rely on chroma alone to communicate links, focus, selection, or hierarchy.
- Keep foreground/background contrast at WCAG AA or better.
- If WebGL or canvas initialization fails, show the existing static Archivo fallback.
- If Intersection Observer or motion capability is unavailable, content remains visible and card borders remain static.
- All animation listeners, observers, RAF work, and Three.js resources must be cleaned up.

## Verification

Add or update automated coverage before implementation where practical.

### Functional browser checks

Verify:

- light-mode and dark-mode ASCII output contains a meaningful non-whitespace glyph density;
- `BERAT`, the H1, and the hero action remain fully contained at 1280x720 and 390x844;
- Projects contains exactly two `data-portfolio-card` elements and both expose the chroma treatment;
- the project grid is asymmetric on desktop and single-column on mobile;
- shared rounded-rectangle ownership is mechanically auditable;
- heading animation can return to its pre-entry state after exit and replay on re-entry;
- the signal tracks scroll progress;
- reduced motion disables continuous signal, heading, card, ASCII, and Skills animation;
- Bubble Menu, focus return, theme persistence, profile-link ownership, and canonical destinations remain correct;
- no horizontal overflow occurs at the mobile target.

### Source audits

Verify:

- no visible content control still uses `rounded-full` except approved icon-only controls;
- no violet or purple chroma tokens are introduced;
- both project cards share the chroma component;
- scroll heading behavior does not use `once: true`;
- Geist Mono remains exclusive to ASCII output;
- colors remain token-driven.

### Completion gate

Run lint, unit tests, production build, the complete zero-retry Playwright matrix, and Next.js runtime diagnostics. Refresh all light/dark screenshot baselines only after functional checks pass. Completion requires a clean working tree and focused commits.

## Out of scope

- Replacing the Chalk Slate base theme
- Adding new portfolio content or destinations
- Adding violet, purple, or generic AI-gradient styling
- Adding terminal windows, code snippets, or decorative telemetry labels
- Adding large parallax transforms or scroll hijacking
- Changing the ASCII semantic identity or section order
