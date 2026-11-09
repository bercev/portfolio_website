// Pure helpers for the hover-preview sweep entrance (RUN9-HOVER-SWEEP):
// the Revolut Single Use Pulse Card Sweep Morph (60fps shot 2114) — a
// clip-path wipe travels left->right across the preview card while a
// reflective sheen band rides the leading edge and dissolves, returning the
// card to its pristine resting state. Entrance-only; reduced motion renders
// the settled card with no wipe and no band.
// The sheen travels SLOWER than the wipe (650ms vs 450ms) on purpose: the
// card's clip-path clips the band, so a band that outruns the wipe edge is
// invisible for the whole entrance (measured in the sync probe — the band's
// first update lands a rAF tick before the clip's, and equal durations let
// it stay ahead). The longer travel keeps the band trailing the wipe edge,
// straddling it mid-travel, then gliding across the settled card as it fades.
export const PREVIEW_SWEEP_WIPE_MS = 450;
export const PREVIEW_SWEEP_SHEEN_MS = 650;
export const PREVIEW_SWEEP_BAND_WIDTH_PX = 72;
// Band travel, as % of the card width: starts fully off the left edge and
// ends fully off the right edge.
export const PREVIEW_SWEEP_BAND_LEFT_START_PCT = -25;
export const PREVIEW_SWEEP_BAND_LEFT_END_PCT = 110;
// The sheen holds full strength for the first 70% of its travel, then fades.
export const PREVIEW_SWEEP_BAND_FADE_START = 0.7;
export const PREVIEW_SWEEP_BAND_OPACITY = 0.95;
// The wipe ends at a -5% expanded inset, not 0%: clip-path clips the card's
// hard offset shadow, and the shadow extends ~2-3% past the border box, so
// a 0% end state would cut it off permanently.
export const PREVIEW_SWEEP_CLIP_END_PCT = -5;

function clamp01(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(1, Math.max(0, progress));
}

function fmt(value: number): string {
  return String(Number(value.toFixed(2)));
}

/** Clip-path for the wipe at progress 0..1: right edge sweeps 100% -> -5%. */
export function previewSweepClip(progress: number): string {
  const p = clamp01(progress);
  const edge = PREVIEW_SWEEP_CLIP_END_PCT * p;
  const right = 100 - (100 - PREVIEW_SWEEP_CLIP_END_PCT) * p;
  return `inset(${fmt(edge)}% ${fmt(right)}% ${fmt(edge)}% ${fmt(edge)}%)`;
}

/** Sheen band `left` at progress 0..1, as % of the card width. */
export function previewSweepBandLeft(progress: number): string {
  const p = clamp01(progress);
  const left =
    PREVIEW_SWEEP_BAND_LEFT_START_PCT +
    p *
      (PREVIEW_SWEEP_BAND_LEFT_END_PCT -
        PREVIEW_SWEEP_BAND_LEFT_START_PCT);
  return `${fmt(left)}%`;
}
