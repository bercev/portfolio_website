# Hero Particle Text Design

## Understanding summary

- Replace the hero's ASCII-rendered `BERAT` with React Bits Pro Particle Text.
- Keep the existing hero layout, biography, semantic heading, and accessible name.
- Recreate the documented Particle Text experience without using proprietary source.
- Match the portfolio's current color tokens in both light and dark themes.
- Preserve a readable static fallback for reduced motion, mobile, and WebGL failure.
- Avoid changing or staging work owned by other active Codex sessions.

## Assumptions

- Interactive particles are appropriate for capable desktop fine-pointer devices.
- The canvas remains transparent and automatically fits the available hero width.
- Static text is preferred when motion or device capability makes WebGL undesirable.
- This change does not redesign the rest of the hero or remove the old ASCII files.

## Design

Implement an original WebGL particle renderer with the project's existing Three.js
dependency, then wrap it in a hero-specific client component. The wrapper owns
portfolio policy: theme-aware colors, responsive dimensions, pointer capability,
reduced-motion behavior, and a plain-text fallback. The server-rendered `Hero`
retains its semantic `h1` and passes the short name to the wrapper, keeping the
client boundary narrow.

The hero wrapper exposes stable data attributes for end-to-end verification. It
renders the canvas as decorative because the heading already provides the accessible
name. If Particle Text cannot run, the same visible `BERAT` text remains available
without requiring WebGL.

## Testing strategy

Update the existing hero effects test first so it expects Particle Text and fails
against the ASCII implementation. Cover the enhanced desktop path and the static
reduced-motion path, while retaining runtime-error checks. Then run focused Playwright
coverage followed by lint, unit tests, type checking, and a production build.

## Decision log

- Use a clean-room Three.js implementation because the licensed registry component
  is unavailable; do not copy or represent it as React Bits Pro source.
- Separate the WebGL scene from the hero wrapper so portfolio policy remains local.
- Keep `Hero` as a Server Component and isolate WebGL inside a Client Component.
- Disable interactivity for reduced motion and unsuitable pointer/device profiles.
- Preserve static visible text as the resilient fallback.
