# Target Cursor Integration

## Understanding

- Replace the desktop Pixel Trail with the supplied React Bits Target Cursor.
- Keep Click Spark and the existing prismatic background unchanged.
- Preserve the existing effect capability policy: no pointer effect on mobile,
  coarse pointers, or for reduced-motion users.
- Use the portfolio cyan accent for the cursor at rest and on targets.
- Make meaningful interactive controls and cards cursor targets.
- Preserve unrelated work already present in the shared checkout.

## Assumptions

- The existing `gsap` dependency remains the animation runtime.
- The supplied component behavior is adapted to TypeScript and the repository's
  React and Next.js conventions rather than copied as untyped JavaScript.
- Existing native focus, click, and pointer behavior remains unchanged.

## Design

Add an isolated client component under `components/effects/`. `EffectStage`
mounts it in place of `PixelTrail` only when the existing profile enables
pointer effects, alongside the unchanged `ClickSpark`. Interactive elements opt
in through the component's default `.cursor-target` selector. Component styles
remain colocated in a CSS module so the class names cannot leak into unrelated
site styling.

The component owns all GSAP timelines, ticker callbacks, timers, and DOM event
listeners and removes them during effect cleanup. The browser cursor is hidden
only while the component is mounted and restored to its prior inline value on
unmount.

Playwright coverage verifies that the Target Cursor replaces Pixel Trail for a
fine pointer, stays absent for coarse pointers and reduced motion, retains Click
Spark, and locks onto an opted-in target.

## Decision Log

- Chose an isolated effect component over section-level cursor logic to avoid
  duplicated animation state and cleanup.
- Chose explicit `.cursor-target` opt-in over automatically targeting every link
  and button so the effect remains intentional.
- Chose the existing effect policy over independent device detection to keep a
  single source of truth for accessibility and pointer capabilities.
