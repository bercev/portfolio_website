// Hero metaballs (RUN10-METABALLS, reel 7) — pure path math for the three
// soft light orbs that drift, merge, and split behind the particle BERAT.
// FROST cyan only; positions are deterministic functions of wall-clock
// time so tests can pin the merge/split behavior exactly.
//
// Geometry is relative to the BERAT box (W × H): blob centers wander on
// Lissajous paths (different periods per axis so the trio never locks
// into a repeating loop) and radii scale with W so the composition holds
// from 390px to desktop. A pair is "merged" when their center distance
// is less than the sum of their radii — with additive ("lighter")
// compositing the overlap then reads as one brighter blob.

export type MetaballSpec = {
  readonly cx: number; // base center x, fraction of box width
  readonly cy: number; // base center y, fraction of box height
  readonly r: number; // radius, fraction of box width
  readonly ax: number; // x wander amplitude, fraction of box width
  readonly ay: number; // y wander amplitude, fraction of box height
  readonly tx: number; // x period, seconds
  readonly ty: number; // y period, seconds
  readonly px: number; // x phase, radians
  readonly py: number; // y phase, radians
  readonly color: string;
  readonly alpha: number; // gradient-core alpha (0..1)
};

export const METABALLS: readonly MetaballSpec[] = [
  {
    cx: 0.24, cy: 0.52, r: 0.16,
    ax: 0.12, ay: 0.13, tx: 11, ty: 13, px: 0, py: 0.6,
    color: "#00e5ff", alpha: 0.32,
  },
  {
    cx: 0.63, cy: 0.44, r: 0.12,
    ax: 0.14, ay: 0.15, tx: 9, ty: 11, px: 2.1, py: 0,
    color: "#0090ff", alpha: 0.3,
  },
  {
    cx: 0.87, cy: 0.64, r: 0.1,
    ax: 0.07, ay: 0.1, tx: 14, ty: 9, px: 4.0, py: 1.8,
    color: "#7dd3fc", alpha: 0.24,
  },
];

export type Metaball = {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly color: string;
  readonly alpha: number;
};

/** Blob centers/radii at time `t` (seconds) in a W×H box. */
export function metaballPositions(
  t: number,
  w: number,
  h: number,
): Metaball[] {
  return METABALLS.map((b) => ({
    x: (b.cx + b.ax * Math.sin((2 * Math.PI * t) / b.tx + b.px)) * w,
    y: (b.cy + b.ay * Math.sin((2 * Math.PI * t) / b.ty + b.py)) * h,
    r: b.r * w,
    color: b.color,
    alpha: b.alpha,
  }));
}

/**
 * Smallest pairwise gap at time `t`: center distance minus the sum of
 * the two radii. Negative = at least one pair is merged; positive = all
 * pairs are split. The merge/split rhythm is the visible story.
 */
export function metaballMinGap(t: number, w: number, h: number): number {
  const blobs = metaballPositions(t, w, h);
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < blobs.length; i++) {
    for (let j = i + 1; j < blobs.length; j++) {
      const dx = blobs[i].x - blobs[j].x;
      const dy = blobs[i].y - blobs[j].y;
      const gap = Math.hypot(dx, dy) - (blobs[i].r + blobs[j].r);
      if (gap < min) min = gap;
    }
  }
  return min;
}

/** Rest time for the reduced-motion static frame: a partially merged pose. */
export const METABALL_REST_T = 6.4;
