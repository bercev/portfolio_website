// Pure helpers for the publication-row light sweep (RUN10-SWEEP):
// the 60fps Revolut pulse-card sweep morph (shot #2114) + React Bits
// Glare Hover — a diagonal band of light travels left->right across the
// hovered publication row, then dissolves, returning the row to its
// resting state. One pass per hover/focus entry; reduced motion renders
// no band at all (CSS media query).
// The band is parked fully off the left edge at rest: its width (140px)
// plus the skew's horizontal shift (tan(12°) * row height, up to ~190px
// for a ~900px mobile row) stays left of 0 at -320px, and it ends 240px
// past the right edge for the same reason. The band holds full strength
// for the first 70% of its travel, then fades — the same hold/fade
// profile as the hover-preview sheen (hover-preview-sweep.ts).
export const PUB_SWEEP_MS = 650;
export const PUB_SWEEP_BAND_WIDTH_PX = 140;
export const PUB_SWEEP_SKEW_DEG = -12;
export const PUB_SWEEP_START_PX = -320;
export const PUB_SWEEP_END_OFFSET_PX = 240;
export const PUB_SWEEP_FADE_START = 0.7;
export const PUB_SWEEP_OPACITY = 0.95;

function clamp01(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(1, Math.max(0, progress));
}

function fmt(value: number): string {
  return String(Number(value.toFixed(2)));
}

/** Sheen band `left` at progress 0..1, in px for a row of `rowWidthPx`. */
export function pubSweepBandLeft(
  progress: number,
  rowWidthPx: number,
): string {
  const p = clamp01(progress);
  const left =
    PUB_SWEEP_START_PX +
    p * (rowWidthPx - PUB_SWEEP_START_PX + PUB_SWEEP_END_OFFSET_PX);
  return `${fmt(left)}px`;
}

/** Band opacity at progress 0..1: full strength until the fade start. */
export function pubSweepBandOpacity(progress: number): number {
  const p = clamp01(progress);
  if (p < PUB_SWEEP_FADE_START) return PUB_SWEEP_OPACITY;
  return (
    PUB_SWEEP_OPACITY *
    (1 - (p - PUB_SWEEP_FADE_START) / (1 - PUB_SWEEP_FADE_START))
  );
}
