/** Slide-to-send model (run-10 iter 42, RUN10-SLIDE-SEND): the contact
 * form's submit pill becomes a luminous slide-the-thumb control.
 *
 * Mechanism after React Bits SlideCommit (MIT + Commons Clause, source read
 * in full from the registry 2026-11-12 — `SlideCommit-TS-TW`): a draggable
 * handle on a track, pointer-capture drag, velocity sampled from the last
 * few moves, spring home on release short of the end, keyboard slider
 * semantics (arrows / Home / End), phases idle → pending → done / error,
 * a spinner while the action runs and a shake on failure. Rebuilt in our
 * own stack and restyled to FROST — no library code copied, no new
 * dependency (motion is already installed; the reference's hugeicons arrow
 * is a plain "→" glyph here).
 *
 * Deliberate deviations from the reference, all per the backlog item:
 * - The reference commits ONLY at full travel. This item requires "flick
 *   also sends": release past the 0.9 threshold with a fast flick
 *   (>= 800 px/s) commits too.
 * - The reference has no Enter/Space binding. A form submit control must
 *   be operable by the activation keys, so Enter/Space drive the thumb to
 *   the end and commit.
 * - The reference takes a fixed width prop. This track is fluid (full form
 *   width), so travel is measured from the live track at drag time.
 * - No squash/stretch on the thumb: the thumb is a glow disc, and a
 *   velocity squash would fight the glow. The light trail + label fade
 *   carry the motion instead.
 * - No "done" pill phase: on success the whole form swaps to the receipt
 *   panel — the site's established success state — so the control never
 *   holds a done state.
 *
 * Pure functions only — the component owns the motion values. */

import type { Transition } from "motion/react";

/** Fraction of travel the thumb must cross for a release to commit. */
export const SLIDE_TO_SEND_THRESHOLD = 0.9;
/** A release flick at or above this speed (px/s) commits from the
 * threshold instead of requiring full travel. */
export const SLIDE_TO_SEND_FLICK_VELOCITY_PX_S = 800;
/** Arrow-key step, as a fraction of travel (the reference's TRAVEL/10). */
export const SLIDE_TO_SEND_KEY_STEP = 0.1;
/** Inset of the thumb inside the track (the reference's PAD). */
export const SLIDE_TO_SEND_PAD_PX = 4;
/** Track height; the thumb is height − 2×PAD (the reference's GRIP). */
export const SLIDE_TO_SEND_HEIGHT_PX = 56;
/** Return-home spring (the reference's commit spring at speed 50:
 * k = 260 + 0.5×640 = 580, mass 0.9, critically damped). */
export const SLIDE_TO_SEND_SPRING_STIFFNESS = 580;
export const SLIDE_TO_SEND_SPRING_MASS = 0.9;
export const SLIDE_TO_SEND_SPRING_DAMPING =
  2 * Math.sqrt(SLIDE_TO_SEND_SPRING_STIFFNESS * SLIDE_TO_SEND_SPRING_MASS);
/** Reduced-motion home: the reference's 0.2s ease-out, not a spring. */
export const SLIDE_TO_SEND_HOME_DURATION_S = 0.2;
/** Error shake keyframes + duration (the reference's SHAKE, 0.45s). */
export const SLIDE_TO_SEND_SHAKE = [0, -5, 5, -3, 3, -1, 0];
export const SLIDE_TO_SEND_SHAKE_MS = 450;
/** The reference's ease-out, shared by the home + shake transitions. */
export const SLIDE_TO_SEND_EASE: [number, number, number, number] = [
  0.23, 1, 0.32, 1,
];
/** Label fade: the reference's `say` transform — the label is gone by
 * 55% of travel. */
export const SLIDE_TO_SEND_LABEL_FADE_END = 0.55;

export type SlideToSendSample = readonly [timeMs: number, xPx: number];

/** Travel of the thumb: track inner width minus the thumb. */
export function slideToSendTravel(
  trackWidthPx: number,
  thumbWidthPx: number,
): number {
  return Math.max(
    1,
    trackWidthPx - 2 * SLIDE_TO_SEND_PAD_PX - thumbWidthPx,
  );
}

/** Thumb width for a track of the standard height. */
export function slideToSendThumbWidth(): number {
  return SLIDE_TO_SEND_HEIGHT_PX - 2 * SLIDE_TO_SEND_PAD_PX;
}

/** Arrow-key step in px for a given travel. */
export function slideToSendKeyStepPx(travelPx: number): number {
  return travelPx * SLIDE_TO_SEND_KEY_STEP;
}

/** Velocity (px/s) from the sampled moves — the reference's velocityOf
 * (first-to-last sample over the window). */
export function slideToSendVelocity(samples: readonly SlideToSendSample[]): number {
  if (samples.length < 2) return 0;
  const [t0, x0] = samples[0];
  const [t1, x1] = samples[samples.length - 1];
  return ((x1 - x0) / Math.max(1, t1 - t0)) * 1000;
}

/** Release decision: commit at full travel, or past the threshold with a
 * fast flick; anything else springs home. */
export function slideToSendShouldCommit(
  xPx: number,
  travelPx: number,
  velocityPxS: number,
): boolean {
  if (xPx >= travelPx) return true;
  return (
    xPx >= SLIDE_TO_SEND_THRESHOLD * travelPx &&
    velocityPxS >= SLIDE_TO_SEND_FLICK_VELOCITY_PX_S
  );
}

/** Label opacity at a thumb position (1 at rest, 0 by 55% of travel). */
export function slideToSendLabelOpacity(
  xPx: number,
  travelPx: number,
): number {
  const end = SLIDE_TO_SEND_LABEL_FADE_END * travelPx;
  if (end <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - xPx / end));
}

/** Return-home transition: critically-damped spring, or the 0.2s ease-out
 * under reduced motion (the reference's goHome branch). */
export function slideToSendHomeTransition(
  reduceMotion: boolean,
): Transition {
  if (reduceMotion) {
    return {
      duration: SLIDE_TO_SEND_HOME_DURATION_S,
      ease: SLIDE_TO_SEND_EASE,
    };
  }
  return {
    type: "spring",
    stiffness: SLIDE_TO_SEND_SPRING_STIFFNESS,
    damping: SLIDE_TO_SEND_SPRING_DAMPING,
    mass: SLIDE_TO_SEND_SPRING_MASS,
  };
}
