/**
 * Author-position dial (run-9 RUN9-AUTHOR-DIALS, 60fps #2134 Runmo
 * Distance Wheel Fill): a radial gauge on each publication plate showing
 * Berat's real author position — SkillOptimizer 5th of 9, @GrokSet 2nd of
 * 8, read from content.ts, never invented. The arc sweeps
 * position/total of the ring; the centre number rolls digit-by-digit
 * (RUN9-ROLLING-DIGITS, folded in as the number engine); hovering the
 * dial crossfades the number to its ordinal (5TH / 2ND).
 *
 * All helpers are pure so the geometry, ordinals, and timings are
 * unit-testable without mounting motion.
 */

import type { Publication } from "@/data/content";

/** The site owner — the dial always measures HIS slot in the list. */
export const AUTHOR_DIAL_SELF = "Berat Ercevik";

/** Arc sweep duration (0.9s ease-out, follows the venue stamp press). */
export const AUTHOR_DIAL_SWEEP_MS = 900;

/** Per-digit roll duration. */
export const AUTHOR_DIAL_DIGIT_MS = 500;

/** Stagger between the two rolling digits. */
export const AUTHOR_DIAL_DIGIT_STAGGER_MS = 80;

/** Entrance delay on plate `index` — after the venue stamp press. */
export const AUTHOR_DIAL_DELAY_S = 0.85;

/** Per-plate stagger, matching the stamp's. */
export const AUTHOR_DIAL_STAGGER_S = 0.03;

/** Dial box size (px) — the SVG viewBox is the same square. */
export const AUTHOR_DIAL_SIZE = 60;

/** Ring radius (px) inside the 60px box. */
export const AUTHOR_DIAL_RADIUS = 22;

/** Ring circumference, for the sweep dash math. */
export const AUTHOR_DIAL_CIRCUMFERENCE = 2 * Math.PI * AUTHOR_DIAL_RADIUS;

export type AuthorDialPosition = {
  /** 1-based slot of the owner in the author list. */
  readonly position: number;
  /** Total authors on the paper. */
  readonly total: number;
};

/**
 * The owner's slot in an author list, 1-based — or null when he is not
 * listed (the dial must never render invented data).
 */
export function authorDialPosition(
  authors: readonly Publication["authors"][number][],
  self: string = AUTHOR_DIAL_SELF,
): AuthorDialPosition | null {
  if (authors.length === 0) return null;
  const index = authors.findIndex((author) => author.name === self);
  if (index < 0) return null;
  return { position: index + 1, total: authors.length };
}

/** Uppercase ordinal: 1ST, 2ND, 3RD, 4TH, 11TH, 12TH, 13TH, 21ST … */
export function authorOrdinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}TH`;
  switch (n % 10) {
    case 1:
      return `${n}ST`;
    case 2:
      return `${n}ND`;
    case 3:
      return `${n}RD`;
    default:
      return `${n}TH`;
  }
}

/** Zero-padded two-digit position: "05", "02". */
export function authorDialPad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Fraction of the ring the sweep arc covers: position / total. */
export function authorDialFraction(position: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, position / total));
}

/** Tick angle in degrees (0 = top, clockwise) for author `index`. */
export function authorDialTickAngle(index: number, total: number): number {
  if (total <= 0) return 0;
  return (index / total) * 360;
}

/**
 * stroke-dashoffset for the sweep arc at entrance progress `p`
 * (0 = hidden, 1 = full sweep): the visible dash grows from 0 to
 * fraction × circumference.
 */
export function authorDialDashOffset(
  circumference: number,
  fraction: number,
  progress: number,
): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return circumference * (1 - fraction * clamped);
}

/** Rolling-digit strip offset: each digit is 1em tall, so digit d sits at -d em. */
export function rollingDigitOffset(digit: number): string {
  return `${-digit}em`;
}

/** Entrance delay (seconds) for the dial on plate `index`. */
export function authorDialDelay(index: number): number {
  return AUTHOR_DIAL_DELAY_S + index * AUTHOR_DIAL_STAGGER_S;
}

/** Roll delay (seconds) for one digit: after the arc is half drawn. */
export function authorDialDigitDelay(index: number, digitIndex: number): number {
  return (
    authorDialDelay(index) +
    AUTHOR_DIAL_SWEEP_MS / 2000 +
    (digitIndex * AUTHOR_DIAL_DIGIT_STAGGER_MS) / 1000
  );
}
