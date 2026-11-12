// Skill rings (RUN10-RINGS, Kokonut apple-activity-card as direction
// reference — read in full 2026-11-12, MIT, v1.1.0; rebuilt in our own
// stack, restyled to FROST, zero new dependencies).
//
// One glowing ring per skill group: the ring draws on scroll into view
// with a count-up in its center, then laps past 100% — the Apple
// Activity-ring language, where the ring keeps going for another lap
// once the goal is hit. Here the "goal" is the group itself: the count
// runs 0 → N skills and the ring closes a full lap, then overlaps the
// seam by SKILL_RING_LAP_OVER so the close reads as a lap, not a stop.
// The count is real (content.ts group sizes: 7 / 5 / 4 / 2); nothing
// is invented to manufacture a ratio.
//
// Pure and server-safe: the component paints these values straight to
// the DOM (stroke-dashoffset + count text) on motion's animate() clock,
// the same mechanism as the reference — the model below is what the
// probes verify against.

/** Ring disc size, px (viewBox units; CSS scales it to 108px ≤700px). */
export const SKILL_RING_SIZE = 132;
/** Ring stroke width, px. */
export const SKILL_RING_STROKE = 10;
/** Rings draw one after another, this far apart (s). */
export const SKILL_RING_STAGGER_S = 0.18;
/** Time for the first lap; the lap past the goal adds up to OVER_S. */
export const SKILL_RING_DRAW_S = 1.2;
export const SKILL_RING_OVER_S = 0.6;
/** How far past the seam the ring laps (in laps): 0.12 ≈ 43°. */
export const SKILL_RING_LAP_OVER = 0.12;
/** The draw's ease — the reference's EASE_OUT, [0.23, 1, 0.32, 1]. */
export const SKILL_RING_EASE: readonly [number, number, number, number] = [
  0.23, 1, 0.32, 1,
];
/** Dimmed-ring opacity (reference value): the unfocused rings recede. */
export const SKILL_RING_DIMMED_OPACITY = 0.25;
/** Dimmed-label opacity (reference value): names/counts dim less than rings. */
export const SKILL_RING_DIMMED_LABEL_OPACITY = 0.4;
/** Goal pulse at the top of the ring when the first lap closes, ms. */
export const SKILL_RING_PULSE_MS = 560;
/**
 * End-cap bead radius, px: the stroke is SKILL_RING_STROKE wide, so a
 * cap the same size as the stroke (r = stroke/2) sits entirely inside
 * it and is invisible in the settled state (iter-41 critics, round 1 —
 * the lap read as a plain uniform circle on both widths). The bead
 * must clear the stroke on both sides to read as a marker.
 */
export const SKILL_RING_CAP_R = SKILL_RING_STROKE / 2 + 3;

export function skillRingRadius(
  size: number = SKILL_RING_SIZE,
  stroke: number = SKILL_RING_STROKE,
): number {
  return (size - stroke) / 2;
}

export function skillRingCircumference(
  size: number = SKILL_RING_SIZE,
  stroke: number = SKILL_RING_STROKE,
): number {
  return skillRingRadius(size, stroke) * 2 * Math.PI;
}

/**
 * Progress in laps (1 = the group fully counted), capped so a huge
 * value stays legible. A group with skills always draws a full lap
 * plus the lap-over; an empty group draws nothing.
 */
export function skillRingRatio(count: number): number {
  return count > 0 ? 1 + SKILL_RING_LAP_OVER : 0;
}

/** Duration of one ring's draw; its count-up runs on the same clock. */
export function skillRingDrawSeconds(ratio: number): number {
  return (
    SKILL_RING_DRAW_S +
    SKILL_RING_OVER_S * Math.min(Math.max(ratio - 1, 0), 1)
  );
}

/** Base (first-lap) stroke-dashoffset at progress `p` (laps). */
export function skillRingBaseOffset(
  p: number,
  circumference: number,
): number {
  return (1 - Math.min(p, 1)) * circumference;
}

/**
 * Overflow-lap progress: 0 while `p` <= 1; the fractional lap past
 * the seam after. A whole number of laps reads as a full lap.
 */
export function skillRingLapRest(p: number): number {
  if (p <= 1) return 0;
  const rest = p - Math.floor(p);
  return rest === 0 ? 1 : rest;
}

/** Overflow-lap stroke-dashoffset at progress `p` (laps). */
export function skillRingLapOffset(p: number, circumference: number): number {
  return (1 - skillRingLapRest(p)) * circumference;
}

/** Count shown at progress `p`; lands exactly on the real value. */
export function skillRingCountAt(
  p: number,
  ratio: number,
  count: number,
): number {
  if (ratio <= 0) return 0;
  return p >= ratio ? count : Math.round((p / ratio) * count);
}

export type SkillRingGroupLike = {
  readonly items: readonly { readonly name: string }[];
};

/**
 * Which group holds this skill (exact name match — activeSkill always
 * comes from the ledger's own items). Null when no skill is active or
 * the name belongs to no group.
 */
export function skillRingGroupForSkill(
  groups: readonly SkillRingGroupLike[],
  skill: string | null,
): number | null {
  if (skill === null) return null;
  const index = groups.findIndex((group) =>
    group.items.some((item) => item.name === skill),
  );
  return index === -1 ? null : index;
}

/**
 * Dim-to-focus: a ring dims when another group holds the focus —
 * either the ledger's active-skill highlight or a hovered/focused
 * ring. The focused group itself never dims.
 */
export function skillRingDimmed(
  activeGroup: number | null,
  focusGroup: number | null,
  index: number,
): boolean {
  if (focusGroup !== null && focusGroup !== index) return true;
  if (activeGroup !== null && activeGroup !== index) return true;
  return false;
}
