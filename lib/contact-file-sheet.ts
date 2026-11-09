/** Contact-form filing motion (run-9 iter 35, RUN9-FILE-THE-SHEET):
 * on a genuine submit success the dispatch sheet files itself — the
 * form card rises, scales down and fades over ~400ms while its height
 * collapses (60fps #2137 Plasma Card Setup: the card rises and scales
 * down into a top hero position), and the stamped RECEIVED completion
 * plate slides in from below (~300ms, 100ms delay) with next steps and
 * a primary action. The shipped receipt pop stays the settled state
 * language (stamp press, title, note) — this is the filing motion
 * around it.
 *
 * Pure variant builders: the component hands them to motion; reduced
 * motion renders an instant swap with a settled receipt (durations 0,
 * identity transforms). The exit variant carries `overflow: "hidden"`
 * so the collapsing form never squishes visible content out of its
 * frame, and `height: 0` so the space below glides up instead of
 * snapping when the form unmounts. */

import type { TargetAndTransition, Transition } from "motion/react";

export const FILE_SHEET_RISE_MS = 400;
export const FILE_SHEET_RISE_Y = -24;
export const FILE_SHEET_SCALE = 0.96;
export const FILE_PLATE_SLIDE_MS = 300;
export const FILE_PLATE_SLIDE_Y = 32;
export const FILE_PLATE_DELAY_MS = 100;
/** The stamp presses in as the plate settles (100ms delay + 300ms
 * slide ≈ 400ms; the press lands just before the plate rests). */
export const FILE_STAMP_DELAY_MS = 350;
export const FILE_STAMP_PRESS_MS = 220;
/** On success the page cuts to the filing container's top so the
 * filing + plate play in view: on a phone the Transmit button sits
 * ~500px below the form's top, so without the cut the receipt lands
 * above the viewport and the visitor never sees the confirmation. */
export const FILE_SHEET_SCROLL_OFFSET_PX = 60;

/** Scroll target for the success cut: the filing container's top,
 * offset clear of the chapter ribbon / section head. */
export function fileSheetScrollTarget(
  containerTop: number,
  scrollY: number,
): number {
  return Math.max(0, containerTop + scrollY - FILE_SHEET_SCROLL_OFFSET_PX);
}
export const FILE_SHEET_EASE: [number, number, number, number] = [
  0.16, 1, 0.3, 1,
];

/** Exit variant for the form card on submit success. */
export function fileSheetFormExit(
  reduceMotion: boolean,
): TargetAndTransition {
  if (reduceMotion) {
    return { opacity: 0, transition: { duration: 0 } };
  }
  return {
    opacity: 0,
    y: FILE_SHEET_RISE_Y,
    scale: FILE_SHEET_SCALE,
    height: 0,
    overflow: "hidden",
    transition: { duration: FILE_SHEET_RISE_MS / 1000, ease: FILE_SHEET_EASE },
  };
}

/** Enter variant for the form card when it returns ("send another"). */
export function fileSheetFormEnter(reduceMotion: boolean): {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  transition: Transition;
} {
  if (reduceMotion) {
    return {
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, y: FILE_PLATE_SLIDE_Y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: FILE_PLATE_SLIDE_MS / 1000, ease: FILE_SHEET_EASE },
  };
}

/** Entrance for the completion plate: slides up from below, delayed so
 * it rides in as the form card files away. */
export function fileSheetReceiptEnter(reduceMotion: boolean): {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  transition: Transition;
} {
  if (reduceMotion) {
    return {
      initial: { opacity: 1, y: 0, scale: 1, rotate: 0 },
      animate: { opacity: 1, y: 0, scale: 1, rotate: 0 },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, y: FILE_PLATE_SLIDE_Y, scale: 1, rotate: 0 },
    animate: { opacity: 1, y: 0, scale: 1, rotate: 0 },
    transition: {
      duration: FILE_PLATE_SLIDE_MS / 1000,
      delay: FILE_PLATE_DELAY_MS / 1000,
      ease: FILE_SHEET_EASE,
    },
  };
}

/** The RECEIVED stamp presses in as the plate settles. */
export function fileSheetStampTransition(reduceMotion: boolean): Transition {
  if (reduceMotion) {
    return { duration: 0 };
  }
  return {
    duration: FILE_STAMP_PRESS_MS / 1000,
    delay: FILE_STAMP_DELAY_MS / 1000,
    ease: FILE_SHEET_EASE,
  };
}
