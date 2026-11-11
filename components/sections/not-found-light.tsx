/**
 * Light void for the 404 (run-10 RUN10-404 — replaces the run-9 ghost
 * wireframe: diagonal cross + dimension lines + "NO DRAWING" stamp, and
 * the run-9 spread measure + torn-sheet edge, which lived in
 * not-found-spread.tsx, now deleted).
 *
 * The missing figure is now a field of light, not a drawing of a void:
 * a glowing track crosses the void's upper third with one light orb
 * drifting along it (the GATHER particle language at rest — a single
 * mote with a bright core, not a crowd), and the verdict — a glow chip,
 * "No light on file" — rests below the track, pressed in on the 220ms
 * family timing, borderless, unrotated, like the contact receipt chip.
 * The caption stays a quiet light caption ("Empty field"). The orb and
 * the chip are deliberately separated: when the core sat dead-center
 * behind the opaque chip it was invisible, and the drift read as a
 * pulse (critics, run-10 iter 11 fix round) — now the core travels
 * the track in the open. The track fades at both ends, brightest at
 * the center, so it reads as light emanating, not a rule spanning
 * the width.
 *
 * No invented figure, no new copy beyond the light-language verdict:
 * the status line, sentence, and action links are untouched. The void
 * is aria-hidden decoration; screen readers get the caption. Reduced
 * motion renders everything settled from the first frame via the native
 * hook (motion's useReducedMotion() is unreliable in this app, run-9
 * iter 1) — the track draws instantly, the orb sits still, the chip
 * presses in with duration 0.
 *
 * Orb-motion sign (run-10 iter 11): the drift MUST use per-value
 * transitions — a shared `repeat: Infinity` transition also repeats
 * the opacity, so the orb fades 0→1 over 7s, snaps to 0, and fades
 * again (a pulse, not a drift). Opacity animates once (0.4s); only
 * x/y loop.
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** The light track draws across the void (0.6s, the measure family). */
export const NOT_FOUND_LIGHT_BEAM_MS = 600;

/** The track starts just after the void enters view. */
export const NOT_FOUND_LIGHT_BEAM_DELAY_S = 0.1;

/** The glow chip presses in after the track, like the venue stamp's 0.7s. */
export const NOT_FOUND_LIGHT_CHIP_DELAY_S = 0.7;

/** The chip presses on the REV-letter / field-note timing (220ms). */
export const NOT_FOUND_LIGHT_CHIP_PRESS_MS = 220;

/** One slow orb drift cycle — calm, not frantic (7s). */
export const NOT_FOUND_LIGHT_ORB_CYCLE_S = 7;

/** The orb's horizontal drift amplitude — big enough to see at 390px. */
export const NOT_FOUND_LIGHT_ORB_X_PX = 34;

/** The orb's vertical drift amplitude — small, so the core stays on the track. */
export const NOT_FOUND_LIGHT_ORB_Y_PX = 10;

/** The track + orb ride at 35% of the void's height; the chip rests at 72%. */
export const NOT_FOUND_LIGHT_TRACK_PC = 35;
export const NOT_FOUND_LIGHT_CHIP_PC = 72;

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Draw delay in seconds for each layer of the light void. */
export function notFoundLightDelay(part: "beam" | "chip"): number {
  if (part === "beam") return NOT_FOUND_LIGHT_BEAM_DELAY_S;
  return NOT_FOUND_LIGHT_CHIP_DELAY_S;
}

export function NotFoundLightVoid() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduceMotion = usePrefersReducedMotion();
  const entered = inView || reduceMotion;
  const beamMs = reduceMotion ? 0 : NOT_FOUND_LIGHT_BEAM_MS;
  const pressMs = reduceMotion ? 0 : NOT_FOUND_LIGHT_CHIP_PRESS_MS;

  return (
    <div ref={ref} className="not-found-light" aria-hidden="true">
      {/* Track — a glowing light line draws across at the orb's height. */}
      <motion.span
        className="not-found-light-beam"
        initial={{ scaleX: 0 }}
        animate={entered ? { scaleX: 1 } : {}}
        transition={{
          duration: beamMs / 1000,
          delay: notFoundLightDelay("beam"),
          ease: SITE_EASE,
        }}
      />
      {/* Orb — one soft mote with a bright core, drifting along the
          track forever. Opacity fades in ONCE; only x/y loop (see the
          sign above — a shared repeating transition pulses the orb). */}
      <motion.span
        className="not-found-light-orb"
        initial={{ opacity: 0 }}
        animate={
          entered
            ? reduceMotion
              ? { opacity: 1 }
              : {
                  opacity: 1,
                  x: [
                    -NOT_FOUND_LIGHT_ORB_X_PX,
                    NOT_FOUND_LIGHT_ORB_X_PX,
                    -NOT_FOUND_LIGHT_ORB_X_PX,
                  ],
                  y: [
                    -NOT_FOUND_LIGHT_ORB_Y_PX,
                    NOT_FOUND_LIGHT_ORB_Y_PX,
                    -NOT_FOUND_LIGHT_ORB_Y_PX,
                  ],
                }
            : {}
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                x: {
                  duration: NOT_FOUND_LIGHT_ORB_CYCLE_S,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                y: {
                  duration: NOT_FOUND_LIGHT_ORB_CYCLE_S,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                opacity: { duration: 0.4, ease: SITE_EASE },
              }
        }
      >
        <span className="not-found-light-orb-glow" />
        <span className="not-found-light-orb-core" />
      </motion.span>
      {/* Verdict — a glow chip below the track, pressed in, borderless
          and unrotated. The wrapper centers it; the chip itself only
          animates scale + opacity, so its transform stays motion's. */}
      <span className="not-found-light-chip-wrap">
        <motion.span
          className="not-found-light-chip"
          data-not-found-glow
          initial={{ scale: 1.12, opacity: 0 }}
          animate={entered ? { scale: 1, opacity: 1 } : {}}
          transition={{
            duration: pressMs / 1000,
            delay: notFoundLightDelay("chip"),
            ease: SITE_EASE,
          }}
        >
          No light on file
        </motion.span>
      </span>
    </div>
  );
}
