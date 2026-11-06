// Static topographic contour lines for the footer band (RUN8-STYLE-TOPO,
// reel 7 #14). A seeded value-noise heightfield plus a few Gaussian hills,
// contoured with marching squares into one SVG path per level. Pure and
// deterministic: the same seed draws the same map on the server and in the
// browser, and the texture never animates — reduced motion is identical by
// construction. No new dependency (cf. shadcn.io's Topography background,
// which uses the same marching-squares-over-noise recipe with every fifth
// line heavier; see the run-8 research pass in STATE.md).

export const TOPO_VIEWBOX = { w: 1200, h: 600 } as const;

/** One contour level: its SVG path data and whether it is an index line. */
export type TopoLevel = {
  readonly d: string;
  readonly index: boolean;
};

const COLS = 120;
const ROWS = 60;
const LEVELS = 10;
const INDEX_EVERY = 5;

/** mulberry32 — tiny deterministic PRNG, seed is the whole state. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** A lattice of seeded values, sampled with smoothstep bilinear filtering. */
function makeValueNoise(
  rng: () => number,
  cellsX: number,
  cellsY: number,
): (x: number, y: number) => number {
  const grid: number[][] = [];
  for (let j = 0; j <= cellsY; j++) {
    const row: number[] = [];
    for (let i = 0; i <= cellsX; i++) row.push(rng());
    grid.push(row);
  }
  return (x, y) => {
    const fx = x * cellsX;
    const fy = y * cellsY;
    const i = Math.min(Math.floor(fx), cellsX - 1);
    const j = Math.min(Math.floor(fy), cellsY - 1);
    const u = smooth(fx - i);
    const v = smooth(fy - j);
    const a = grid[j][i];
    const b = grid[j][i + 1];
    const c = grid[j + 1][i];
    const d = grid[j + 1][i + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

type Bump = {
  readonly cx: number;
  readonly cy: number;
  readonly sigma: number;
  readonly amp: number;
};

/** The heightfield: two octaves of value noise plus seeded Gaussian hills,
 * so the map has closed rings (hills) as well as open ridge lines. */
function buildField(seed: number): number[][] {
  const rng = mulberry32(seed);
  const coarse = makeValueNoise(rng, 6, 3);
  const fine = makeValueNoise(rng, 12, 6);
  const bumps: Bump[] = [];
  for (let k = 0; k < 3; k++) {
    bumps.push({
      cx: 0.15 + 0.7 * rng(),
      cy: 0.2 + 0.6 * rng(),
      sigma: 0.09 + 0.08 * rng(),
      amp: 0.5 + 0.5 * rng(),
    });
  }
  const field: number[][] = [];
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j <= ROWS; j++) {
    const row: number[] = [];
    for (let i = 0; i <= COLS; i++) {
      const x = i / COLS;
      const y = j / ROWS;
      let h = 0.62 * coarse(x, y) + 0.38 * fine(x, y);
      for (const b of bumps) {
        const dx = (x - b.cx) / b.sigma;
        const dy = (y - b.cy) / b.sigma;
        h += b.amp * 0.35 * Math.exp(-(dx * dx + dy * dy));
      }
      row.push(h);
      if (h < min) min = h;
      if (h > max) max = h;
    }
    field.push(row);
  }
  // Normalize to 0..1 so the level thresholds are stable across seeds.
  const span = max - min || 1;
  for (let j = 0; j <= ROWS; j++) {
    for (let i = 0; i <= COLS; i++) field[j][i] = (field[j][i] - min) / span;
  }
  return field;
}

type Pt = readonly [number, number];

/**
 * Marching squares over the field at one threshold. Each cell contributes
 * the segments separating its above-threshold corners from the rest; the
 * saddle cases (5, 10) emit one segment per above corner, which keeps the
 * pairing consistent across the grid.
 */
function contourLevel(field: number[][], t: number): string {
  const cw = TOPO_VIEWBOX.w / COLS;
  const ch = TOPO_VIEWBOX.h / ROWS;
  const segs: string[] = [];
  const interp = (
    x0: number,
    y0: number,
    v0: number,
    x1: number,
    y1: number,
    v1: number,
  ): Pt => {
    const f = v1 === v0 ? 0.5 : (t - v0) / (v1 - v0);
    return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f];
  };
  const fmt = (p: Pt) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const a = field[j][i];
      const b = field[j][i + 1];
      const c = field[j + 1][i + 1];
      const d = field[j + 1][i];
      const idx =
        (a >= t ? 8 : 0) + (b >= t ? 4 : 0) + (c >= t ? 2 : 0) + (d >= t ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const x0 = i * cw;
      const x1 = (i + 1) * cw;
      const y0 = j * ch;
      const y1 = (j + 1) * ch;
      // Edge crossings: T = a-b, R = b-c, B = d-c, L = a-d.
      const top = interp(x0, y0, a, x1, y0, b);
      const right = interp(x1, y0, b, x1, y1, c);
      const bottom = interp(x0, y1, d, x1, y1, c);
      const left = interp(x0, y0, a, x0, y1, d);
      const emit = (p: Pt, q: Pt) => {
        segs.push(`M${fmt(p)}L${fmt(q)}`);
      };
      switch (idx) {
        case 1:
          emit(left, bottom);
          break;
        case 2:
          emit(bottom, right);
          break;
        case 3:
          emit(left, right);
          break;
        case 4:
          emit(top, right);
          break;
        case 5:
          emit(top, right);
          emit(left, bottom);
          break;
        case 6:
          emit(top, bottom);
          break;
        case 7:
          emit(top, left);
          break;
        case 8:
          emit(top, left);
          break;
        case 9:
          emit(top, bottom);
          break;
        case 10:
          emit(top, left);
          emit(bottom, right);
          break;
        case 11:
          emit(top, right);
          break;
        case 12:
          emit(left, right);
          break;
        case 13:
          emit(bottom, right);
          break;
        case 14:
          emit(left, bottom);
          break;
      }
    }
  }
  return segs.join("");
}

/** All contour levels for one seed, evenly spaced across the field range. */
export function buildTopoPaths(seed: number): TopoLevel[] {
  const field = buildField(seed);
  const levels: TopoLevel[] = [];
  for (let k = 0; k < LEVELS; k++) {
    const t = (k + 1) / (LEVELS + 1);
    levels.push({
      d: contourLevel(field, t),
      index: (k + 1) % INDEX_EVERY === 0,
    });
  }
  return levels;
}
