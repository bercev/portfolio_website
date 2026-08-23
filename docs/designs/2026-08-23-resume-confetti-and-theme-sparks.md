# Resume confetti and theme-aware click sparks

## Intent

- Trigger a full-width, top-edge confetti shower from the visible resume download.
- Preserve the download and skip decorative motion when reduced motion is enabled.
- Use black click sparks in base light mode and white sparks in base dark mode.
- Keep the selected palette accent when a color palette is active.

## Design

Keep the confetti canvas and click handler local to `BubbleMenu`, which owns the
visible resume action. Generate 25 evenly spaced top-edge emitters with eight
particles each so the result reads as one continuous curtain rather than a few
concentrated bursts. Resolve ClickSpark color from the active palette first,
then from the resolved light/dark theme.

## Decision log

- Reuse the existing `canvas-confetti` wrapper instead of adding a dependency.
- Prefer a uniform row of small emitters over a few concentrated bursts.
- Avoid a global event bus because only the utility menu initiates resume downloads.
