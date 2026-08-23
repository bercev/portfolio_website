# Resume confetti and theme-aware click sparks

## Intent

- Trigger a full-width, top-edge confetti shower from the visible resume download.
- Preserve the download and skip decorative motion when reduced motion is enabled.
- Use black click sparks in base light mode and white sparks in base dark mode.
- Keep the selected palette accent when a color palette is active.

## Design

Keep the confetti canvas and click handler local to `BubbleMenu`, which owns the
visible resume action. Generate a small deterministic set of top-edge confetti
bursts so their geometry can be unit tested. Resolve ClickSpark color from the
active palette first, then from the resolved light/dark theme.

## Decision log

- Reuse the existing `canvas-confetti` wrapper instead of adding a dependency.
- Prefer several top-edge origins over a single center burst for full-width coverage.
- Avoid a global event bus because only the utility menu initiates resume downloads.
