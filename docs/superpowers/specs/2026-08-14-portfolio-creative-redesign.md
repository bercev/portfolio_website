# Portfolio Creative Redesign

**Date:** 2026-08-14
**Status:** Approved for implementation
**Supersedes:** The visual composition and typography portions of `2026-08-08-portfolio-design.md`; content, accessibility, theme, effects policy, information architecture, and deployment constraints remain authoritative.

## 1. Design read

A one-page developer portfolio for recruiters and technically literate creative peers. The page uses an editorial-grotesque, kinetic-type language with one memorable signature: a responsive ASCII rendering of "Berat." The surrounding interface stays quiet, spacious, and structurally varied so it does not compete with the hero.

Design dials:

- Design variance: 8/10
- Motion intensity: 6/10 on capable desktops, 2/10 for reduced motion
- Visual density: 4/10

## 2. Goals

- Make the ASCII hero unmistakably memorable without clipping or crowding the initial viewport.
- Faithfully adapt the React Bits ASCII Text rendering architecture instead of using a fixed five-row block alphabet.
- Use Archivo intentionally for every non-ASCII text role.
- Give About, Publications, Experience, Projects, and Skills different compositional structures.
- Remove decorative numbering, repeated card shells, and repeated technology-pill treatments.
- Keep one action per intent and remove repeated GitHub, LinkedIn, and Resume links from the hero.
- Preserve the current one-page section order, content module, theme behavior, effect gating, semantics, and URLs.

## 3. Hero

The hero contains four elements:

1. Accessible H1 text for "Berat Ercevik."
2. A large ASCII rendering of "Berat" as the visual form of the H1.
3. One concrete positioning line using the existing factual content: software engineering across full-stack applications, agentic systems, and AI research.
4. One internal "View projects" action that scrolls to `#projects`.

The rotating traits and duplicated external profile links leave the hero. GitHub, LinkedIn, and Resume remain together in the contact footer.

The hero must fit at 1280x720 and 390x844 with the H1 and action fully visible. The ASCII output must stay within the viewport at every supported width.

## 4. ASCII effect

Implement an adapted, locally owned version of the official React Bits ASCII Text architecture:

- Draw text to an offscreen canvas.
- Render and distort the text texture with Three.js/WebGL on capable clients.
- Downsample the rendered image and map luminance values to ASCII characters in a preformatted overlay.
- Use the existing Geist Mono font only inside the ASCII renderer because fixed-width glyph alignment is required.
- Resolve text and gradient colors from project CSS variables rather than hardcoded component colors.
- Mark canvases and rendered ASCII glyphs decorative; expose one stable semantic H1.

Capability behavior:

- Desktop, fine pointer, no reduced motion: animated waves and restrained pointer tilt.
- Touch/mobile: lower pixel density, larger ASCII cells, no pointer tilt, and reduced wave amplitude.
- Reduced motion: render one stable frame and stop the animation loop.
- WebGL or canvas failure: show a responsive static text fallback without affecting semantics or layout.

The effect is isolated in a Client Component and cleans up animation frames, observers, listeners, textures, materials, geometry, and renderer resources.

## 5. Typography and color

- Archivo is the display and body family for every non-ASCII element.
- Geist Mono is loaded solely for the ASCII renderer.
- Small metadata uses Archivo 500 or 600 with restrained tracking. It is not a decorative eyebrow system.
- The existing Chalk Slate light/dark tokens and cyan accent remain.
- Remove the global anchor cascade conflict so explicit text-color utilities work.
- Every interactive element must meet WCAG AA contrast in both themes.

## 6. Section compositions

### About

Keep the asymmetric biography and education split. Replace the education glow card with an inset editorial panel using a single border and grouped coursework text. Coursework is not rendered as pills.

### Publications

Use two full-width media-led rows. Each row pairs the real placeholder image area with venue, date, and title. Remove image number overlays, card shells, and decorative indices. Keep image dimensions and links unchanged.

### Experience

Use a quiet chronological list with dates in a narrow column and role, organization, summary, and technologies in the main column. Separate entries with one bottom divider. Remove glow cards, sequence numbers, and technology pills. Technologies render as compact inline metadata.

### Projects

Use content hierarchy rather than arbitrary numbering. Vitae is the featured project because it has a live destination; it receives the page's single BorderGlow treatment and larger grid share. AI Discord Chatbot is a supporting editorial block without a card shell. Technologies use inline metadata rather than pills.

### Skills

Keep the marquee as the section's distinct motion pattern and the only repeating pill treatment on the page. Pause-on-hover/focus and reduced-motion behavior remain.

### Contact

Keep GitHub, LinkedIn, and Resume in one place. Maintain the bottom safe-area allowance for the Bubble Menu.

## 7. Motion hierarchy

The ASCII hero is the primary orchestrated moment. Other motion remains subordinate:

- Prismatic background stays atmospheric.
- Section heading warp remains restrained and one-shot.
- Skills marquee remains the page's only marquee.
- Bubble Menu motion communicates state.
- Pointer trail and click spark remain desktop-only under the existing capability policy.
- BorderGlow appears only on the featured Vitae project.

## 8. Accessibility and responsive behavior

- Preserve semantic section order, landmarks, heading levels, anchor IDs, and canonical links.
- All touch targets remain at least 44px high.
- Bubble Menu retains Escape handling, focus return, and safe-area positioning.
- Decorative canvases are hidden from assistive technology and pointer-inert.
- No horizontal clipping at 390px or narrower supported layouts.
- Light and dark themes retain readable hierarchy and visible focus treatment.

## 9. Dependencies and boundaries

- Add `three` and its TypeScript declarations if required by the installed package version.
- Do not introduce GSAP, React Three Fiber, another component system, or new global state.
- Keep static sections as Server Components. Only the ASCII renderer and existing interactive effects are Client Components.
- Keep all visible copy in `data/content.ts`.

## 10. Verification

Implementation is complete only when all of the following are fresh and passing:

1. ESLint.
2. Unit tests, including ASCII luminance/character mapping and fallback behavior where practical.
3. Production build.
4. Functional Playwright coverage for semantic order, links, themes, keyboard use, reduced motion, and effect gating.
5. Explicit 1280x720 and 390x844 hero viewport checks.
6. Computed contrast checks for hero and footer actions in light and dark themes.
7. Updated deterministic light/dark screenshots after the implementation is accepted as the new baseline.
8. No Next.js runtime, console, page, or same-origin request errors.
