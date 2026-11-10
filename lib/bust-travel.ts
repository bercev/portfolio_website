/**
 * bust-travel — the portrait bust travels as a parked figure (run 9,
 * RUN9-BUST-TRAVEL).
 *
 * DIAGNOSIS (iter-49, from the iter-48 audit frames): the "ghost numerals"
 * floating over the bust ("018" in the hero frame, "18 X" in the light
 * pass, "18x5" — really "18×S" — at Experience) are NOT bust particles.
 * They are the run-7 Living ASCII glyph stream (light-ribbons.tsx):
 * 36px semibold mono glyphs from the identity GLYPHS vocab — which
 * contains `0`, `1`, `8`, `X`, `S`, `×` — marching +x at 165px/s along
 * the bright band's centerline, drawn only in the free right margin
 * band at 1440px (x ≈ colR+24 … W-24). That band IS the bust's lane:
 * the bust box sits at x ≈ 1068–1368 while the band runs ≈ 1280–1416,
 * so the stream marches straight through the dome and past its right
 * edge, and the 0.6 alpha floor makes random triples glance-legible as
 * codes. The mid-scroll "blue smudge bleeding off the right edge" is
 * the bust itself: fixed, right-anchored, soft-masked on both edges,
 * lingering at its 0.12 yielded ghost between chapters where it has no
 * role — the hero portrait and the contact turn-back are its two
 * moments, the middle is dead weight.
 *
 * THE FIX, two coupled moves:
 * 1. The bust PARKS between chapters: visible at hero (chapter 0) and
 *    contact (chapter 6), faded to 0 — the same 600ms CSS fade as the
 *    yield — for chapters 1–5. The turn grammar is untouched: yaw still
 *    advances on the shared snapshot while parked, so the figure is at
 *    the right pose when it fades back in at contact.
 * 2. The glyph stream YIELDS to the portrait: the bust publishes its
 *    live box + target opacity to a module holder (one source of truth —
 *    the actual rect, dive transform included), and the stream skips
 *    any glyph whose center falls inside the box inflated by the
 *    clearance, while the bust is bright (target opacity >= 0.2). The
 *    0.12 yielded ghost is below the gate: a ghost that thin is not a
 *    figure to collide with, and margin glyphs over it read as the
 *    stream's own texture. When the bust is parked its opacity is 0,
 *    the gate lifts, and the stream flows in the margin again — the
 *    margin belongs to the bust at the hero, to the stream between
 *    chapters. At 1440px the box + clearance covers the whole right
 *    band, so the hero stream reads 0 glyphs: intended, not a
 *    regression — the hero already moves (BERAT particles, tagline,
 *    ticker) and the stream's job is the margin between chapters.
 *
 * Pure, server-safe geometry + decision logic; the holder is the only
 * mutable state (same pattern as scrollSnapshot in lib/scroll-fx.ts).
 * The DOM classifiers and the React wiring live in
 * particle-portrait-bust.tsx / light-ribbons.tsx.
 */

import { bustYieldOpacity } from "./bust-yield";

/** Last chapter index — "contact" in CHAPTER_IDS (lib/scroll-fx.ts). */
export const BUST_TRAVEL_CONTACT_INDEX = 6;
/** Clearance around the bust box inside which no stream glyph may sit
 * (px) — a 36px glyph centered this far out clears the box edge. */
export const BUST_STREAM_CLEARANCE_PX = 24;
/** The stream yields only while the bust is at least this visible —
 * the 0.12 yielded ghost is below the gate by design. */
export const BUST_STREAM_MIN_OPACITY = 0.2;

export type BustTravelBox = {
  /** Viewport x of the bust box's left edge (getBoundingClientRect). */
  x: number;
  /** Viewport y of the bust box's top edge. */
  y: number;
  width: number;
  height: number;
  /** The bust's TARGET opacity (0.65 bright / 0.12 yielded / 0 parked). */
  opacity: number;
};

/**
 * Parked between chapters: the bust shows at hero (0) and contact
 * (contactIndex) and fades out for every chapter between them.
 */
export function bustParked(
  chapterIndex: number,
  contactIndex: number = BUST_TRAVEL_CONTACT_INDEX,
): boolean {
  return chapterIndex > 0 && chapterIndex < contactIndex;
}

/**
 * The bust box opacity: parked beats yielded — a parked bust is gone
 * (0), not a ghost; unparked it follows the yield (0.65 / 0.12).
 */
export function bustTravelOpacity(
  yielded: boolean,
  parked: boolean,
): number {
  return parked ? 0 : bustYieldOpacity(yielded);
}

/**
 * Does a stream glyph centered at (gx, gy) collide with the bust?
 * False when there is no bust, when it is too faint to collide with,
 * or when the point clears the inflated box.
 */
export function streamGlyphHiddenByBust(
  gx: number,
  gy: number,
  bust: BustTravelBox | null,
  clearance: number = BUST_STREAM_CLEARANCE_PX,
): boolean {
  if (!bust) return false;
  if (!(bust.opacity >= BUST_STREAM_MIN_OPACITY)) return false;
  if (!(bust.width > 0 && bust.height > 0)) return false;
  return (
    gx >= bust.x - clearance &&
    gx <= bust.x + bust.width + clearance &&
    gy >= bust.y - clearance &&
    gy <= bust.y + bust.height + clearance
  );
}

/* ------------------------------------------------------------------ */
/* Live bust box — written by the bust's sampler, read by the stream. */
/* ------------------------------------------------------------------ */

let currentBox: BustTravelBox | null = null;

export function setBustTravelBox(box: BustTravelBox | null): void {
  currentBox = box;
}

export function getBustTravelBox(): BustTravelBox | null {
  return currentBox;
}
