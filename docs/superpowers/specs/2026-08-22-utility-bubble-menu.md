# Utility Bubble Menu

## Understanding

- Replace the bottom bubble menu's section routes with GitHub, LinkedIn, Resume,
  light/dark mode, and color-theme controls.
- Remove the same utilities from the fixed header to avoid duplicate actions.
- Keep the right-side line navigation as the page's section-routing control.
- Preserve the existing bubble animation, keyboard behavior, responsive layout,
  target-cursor opt-in, and reduced-motion behavior.
- Reuse the existing contact-link data, theme provider, and palette provider.

## Assumptions

- Resume remains a downloadable `/resume.pdf` link.
- Social profiles continue opening in a new tab.
- Choosing light/dark or a palette does not close the utility menu.
- No new dependency or additional network request is needed.

## Design

The server-rendered page passes the existing contact links to `BubbleMenu` as
serializable props. `BubbleMenu` remains a focused Client Component and renders
five animated bubbles: three semantic links, a light/dark toggle, and the
existing palette selector. The header retains only the home monogram. The line
sidebar remains unchanged and continues to own section navigation.

On mobile, the five controls use a centered two-row grid. On desktop, they use
the existing loose arc composition. Every interactive control retains native
link or button semantics, visible focus treatment, and explicit accessible
names.

## Decision Log

- Chose a single utility location instead of duplicating controls in the header.
- Kept line-sidebar routing instead of removing section navigation entirely.
- Reused existing providers and controls instead of introducing new state.
- Kept the current visual system instead of redesigning the menu surface.

