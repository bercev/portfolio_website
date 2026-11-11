/** Contact-form flow motion (run-10 iter 10, RUN10-CONTACT): on a genuine
 * submit success the form lifts away on light — it rises, scales down
 * and fades over ~400ms while its height collapses (60fps #2137 Plasma
 * Card Setup: the card rises and scales down into a top hero position),
 * and the RECEIVED glow panel slides in from below (~300ms, 100ms delay)
 * with next steps + a primary action. The shipped receipt pop stays the
 * settled state language (glow press, title, note) — this is the flow
 * motion around it.
 *
 * Pure variant builders: the component hands them to motion; reduced
 * motion renders an instant swap with a settled receipt (durations 0,
 * identity transforms). The exit variant carries `overflow: "hidden"`
 * so the collapsing form never squishes visible content out of its
 * frame, and `height: 0` so the space below glides up instead of
 * snapping when the form unmounts. */

import type { TargetAndTransition, Transition } from "motion/react";

export const CONTACT_FLOW_RISE_MS = 400;
export const CONTACT_FLOW_RISE_Y = -24;
export const CONTACT_FLOW_SCALE = 0.96;
export const CONTACT_FLOW_SLIDE_MS = 300;
export const CONTACT_FLOW_SLIDE_Y = 32;
export const CONTACT_FLOW_DELAY_MS = 100;
/** The glow presses in as the panel settles (100ms delay + 300ms
 * slide ≈ 400ms; the press lands just before the panel rests). */
export const CONTACT_FLOW_GLOW_DELAY_MS = 350;
export const CONTACT_FLOW_GLOW_PRESS_MS = 220;
/** On success the page cuts to the flow container's top so the lift +
 * glow play in view: on a phone the Transmit button sits ~500px below
 * the form's top, so without the cut the receipt lands above the
 * viewport and the visitor never sees the confirmation. */
export const CONTACT_FLOW_SCROLL_OFFSET_PX = 60;

/** Scroll target for the success cut: the flow container's top,
 * offset clear of the chapter ribbon / section head. */
export function contactFlowScrollTarget(
  containerTop: number,
  scrollY: number,
): number {
  return Math.max(0, containerTop + scrollY - CONTACT_FLOW_SCROLL_OFFSET_PX);
}
export const CONTACT_FLOW_EASE: [number, number, number, number] = [
  0.16, 1, 0.3, 1,
];

/** Exit variant for the form panel on submit success. */
export function contactFlowFormExit(
  reduceMotion: boolean,
): TargetAndTransition {
  if (reduceMotion) {
    return { opacity: 0, transition: { duration: 0 } };
  }
  return {
    opacity: 0,
    y: CONTACT_FLOW_RISE_Y,
    scale: CONTACT_FLOW_SCALE,
    height: 0,
    overflow: "hidden",
    transition: { duration: CONTACT_FLOW_RISE_MS / 1000, ease: CONTACT_FLOW_EASE },
  };
}

/** Enter variant for the form panel when it returns ("send another"). */
export function contactFlowFormEnter(reduceMotion: boolean): {
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
    initial: { opacity: 0, y: CONTACT_FLOW_SLIDE_Y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: CONTACT_FLOW_SLIDE_MS / 1000, ease: CONTACT_FLOW_EASE },
  };
}

/** Entrance for the receipt panel: slides up from below, delayed so
 * it rides in as the form panel lifts away. */
export function contactFlowReceiptEnter(reduceMotion: boolean): {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  transition: Transition;
} {
  if (reduceMotion) {
    return {
      initial: { opacity: 1, y: 0, scale: 1 },
      animate: { opacity: 1, y: 0, scale: 1 },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, y: CONTACT_FLOW_SLIDE_Y, scale: 1 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: {
      duration: CONTACT_FLOW_SLIDE_MS / 1000,
      delay: CONTACT_FLOW_DELAY_MS / 1000,
      ease: CONTACT_FLOW_EASE,
    },
  };
}

/** The RECEIVED glow presses in as the panel settles — a gentle
 * scale from 1.12, no rotation (run-10: the rotated stamp is gone). */
export function contactFlowGlowTransition(reduceMotion: boolean): Transition {
  if (reduceMotion) {
    return { duration: 0 };
  }
  return {
    duration: CONTACT_FLOW_GLOW_PRESS_MS / 1000,
    delay: CONTACT_FLOW_GLOW_DELAY_MS / 1000,
    ease: CONTACT_FLOW_EASE,
  };
}
