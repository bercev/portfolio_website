// Liquid-fill gauge for the @GrokSet corpus scale (RUN10-GAUGE) —
// pure surface/level model, distilled from Kokonut Liquid Gauge
// CD-09 v1.0.0 (2026-10-14, @dorianbaffier, MIT — source read in
// full from https://kokonutui.com/r/liquid-gauge.json, rebuilt in our
// own stack, zero new deps). The reference is a storage gauge you
// drag to set a value; ours is a READ-ONLY display of a real figure,
// so the model keeps the reference's pour + slosh physics but drops
// the value-setting: the level is pinned to the corpus (100%), a
// sideways drag only rocks the surface, and a pointer moving through
// the liquid stirs it.
//
// Physics (Kokonut's constants, verbatim — they are the reason the
// pour reads as a poured glass): the surface is a row of columns
// joined by springs, each bobbing around the fill line and pulling on
// its neighbours so a push travels; the fill line follows its target
// on an underdamped spring, so a big change overshoots a little and
// settles. Fixed 1/120s steps, so the motion is identical at any
// frame rate and the verification probes can predict it exactly.

/** Surface columns — the wave's resolution (Kokonut COLUMNS). */
export const CORPUS_GAUGE_COLUMNS = 28;
/** Fixed simulation step, seconds (Kokonut STEP). */
export const CORPUS_GAUGE_STEP = 1 / 120;
/** Neighbour pull — how fast a push travels along the surface. */
export const CORPUS_GAUGE_SPREAD = 2600;
/** Surface restore — how hard each column returns to the fill line. */
export const CORPUS_GAUGE_RESTORE = 18;
/** Surface damping — lowered from Kokonut's 2.2 to 1.1 (iter-47
 * fix1): the tilt mode's decay constant is ζω, so 2.2 rings for
 * τ≈0.9s and a headless screenshot (~2s after release) catches a
 * flat surface; 1.1 rings for τ≈1.8s, so the slosh is still several
 * px at capture. A real glass sloshes for seconds; the pour is
 * unaffected (the level spring is untouched and the surface is flat
 * during the pour). */
export const CORPUS_GAUGE_SURFACE_DAMPING = 1.1;
/** Fill-line spring stiffness — the pour's overshoot. */
export const CORPUS_GAUGE_LEVEL_STIFFNESS = 90;
/** Fill-line spring damping. */
export const CORPUS_GAUGE_LEVEL_DAMPING = 11;
/** How hard a sideways drag rocks the liquid. */
export const CORPUS_GAUGE_SLOSH = 4.5;
/** How hard the pointer stirs the liquid when moving through it. */
export const CORPUS_GAUGE_STIR = 20;
/** Largest surface excursion, px — the wave's ceiling. */
export const CORPUS_GAUGE_MAX_WAVE = 26;
/** The meniscus: a lighter band riding just above the surface, px. */
export const CORPUS_GAUGE_RIM = 3;
/** Rising bubbles while the level climbs. */
export const CORPUS_GAUGE_BUBBLES = 10;
/** Bubble spawn rate per unit of climb speed. */
export const CORPUS_GAUGE_BUBBLE_RATE = 0.06;
/** Energy below which the surface is at rest. */
export const CORPUS_GAUGE_REST_EPSILON = 0.02;

/** The corpus fills the gauge: 1M+ tweets is the whole vessel. */
export const CORPUS_GAUGE_FILL = 100;
/** Headroom between the settled surface and the vessel's rim, px
 * (iter-47 fix1): at 100% fill with no headroom the surface
 * coincides with the vessel's top edge, so a drag tilt has nowhere
 * visible to go — only a dip corner shows, clipped by the vessel.
 * 14px puts the whole slant inside the glass, and the meniscus rim
 * rides visibly just under the top edge at rest. */
export const CORPUS_GAUGE_HEADROOM_PX = 14;
/** The verbatim figure from data/content.ts (experience copy). */
export const CORPUS_GAUGE_FIGURE = "1M+ tweets";
/** What the figure counts. */
export const CORPUS_GAUGE_SUBLINE = "public Grok conversations";
/** The gauge's label — whose corpus this is. */
export const CORPUS_GAUGE_LABEL = "@GrokSet corpus";

export interface CorpusGaugeBubble {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
  alive: boolean;
}

/** Mutable simulation state — one object per gauge, stepped by the
 * component's rAF loop (or by the tests, step by step). */
export interface CorpusGaugeState {
  level: number;
  levelSpeed: number;
  target: number;
  heights: number[];
  speeds: number[];
  bubbles: CorpusGaugeBubble[];
  spawn: number;
  time: number;
}

export function createCorpusGaugeState(): CorpusGaugeState {
  return {
    level: 0,
    levelSpeed: 0,
    target: 0,
    heights: new Array(CORPUS_GAUGE_COLUMNS).fill(0),
    speeds: new Array(CORPUS_GAUGE_COLUMNS).fill(0),
    bubbles: Array.from({ length: CORPUS_GAUGE_BUBBLES }, () => ({
      x: 0,
      y: 0,
      r: 0,
      speed: 0,
      phase: 0,
      alive: false,
    })),
    spawn: 0,
    time: 0,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** The fill line's y in a vessel of this height (0 = top). The
 * settled surface sits `headroom` below the rim, so the full
 * corpus still reads as a brimming glass with a visible meniscus. */
export function corpusGaugeLevelY(
  level: number,
  height: number,
  headroom = 0,
): number {
  return (
    headroom + (height - headroom) * (1 - clamp(level, 0, 100) / 100)
  );
}

/** One fixed step: the level spring chases its target, the surface
 * springs settle, the clock advances. Returns the residual energy —
 * the loop runs while it stays above CORPUS_GAUGE_REST_EPSILON. */
export function corpusGaugeStep(
  state: CorpusGaugeState,
  dt: number = CORPUS_GAUGE_STEP,
): number {
  const { heights, speeds } = state;
  const force =
    (state.target - state.level) * CORPUS_GAUGE_LEVEL_STIFFNESS -
    state.levelSpeed * CORPUS_GAUGE_LEVEL_DAMPING;
  state.levelSpeed += force * dt;
  state.level += state.levelSpeed * dt;
  let energy =
    Math.abs(state.target - state.level) + Math.abs(state.levelSpeed) * 0.1;
  for (let i = 0; i < CORPUS_GAUGE_COLUMNS; i++) {
    const left = heights[i > 0 ? i - 1 : i];
    const right = heights[i < CORPUS_GAUGE_COLUMNS - 1 ? i + 1 : i];
    const accel =
      (left + right - 2 * heights[i]) * CORPUS_GAUGE_SPREAD -
      heights[i] * CORPUS_GAUGE_RESTORE -
      speeds[i] * CORPUS_GAUGE_SURFACE_DAMPING;
    speeds[i] += accel * dt;
  }
  for (let i = 0; i < CORPUS_GAUGE_COLUMNS; i++) {
    heights[i] = clamp(
      heights[i] + speeds[i] * dt,
      -CORPUS_GAUGE_MAX_WAVE,
      CORPUS_GAUGE_MAX_WAVE,
    );
    energy = Math.max(
      energy,
      Math.abs(heights[i]),
      Math.abs(speeds[i]) * 0.1,
    );
  }
  state.time += dt;
  return energy;
}

/** Settle exactly: level on target, surface flat — the resting
 * state the loop snaps to when the energy falls below epsilon, so
 * a settled gauge is pixel-flat, never a slow drift. */
export function corpusGaugeSettle(state: CorpusGaugeState): void {
  state.level = state.target;
  state.levelSpeed = 0;
  state.heights.fill(0);
  state.speeds.fill(0);
}

/** Push the columns around fractional x by `amount`, fading out
 * over a few columns — a drop landing, a stir, a bubble popping. */
export function corpusGaugeDisturb(
  state: CorpusGaugeState,
  xFrac: number,
  amount: number,
  reach = 3,
): void {
  const center = clamp(xFrac, 0, 1) * (CORPUS_GAUGE_COLUMNS - 1);
  for (let i = 0; i < CORPUS_GAUGE_COLUMNS; i++) {
    const falloff = 1 - Math.abs(i - center) / reach;
    if (falloff > 0) state.speeds[i] += amount * falloff;
  }
}

/** A sideways drag rocks the whole body: one side rises, the other
 * falls, and the springs carry it back and forth. This is the ONLY
 * thing a drag does — the level never moves, so the figure stays
 * verbatim no matter how hard the gauge is sloshed. */
export function corpusGaugeSlosh(state: CorpusGaugeState, dx: number): void {
  for (let i = 0; i < CORPUS_GAUGE_COLUMNS; i++) {
    state.speeds[i] +=
      ((i / (CORPUS_GAUGE_COLUMNS - 1)) * 2 - 1) *
      dx *
      CORPUS_GAUGE_SLOSH;
  }
}

/** Largest surface excursion right now — the slosh probe reads this
 * to prove the wave is real and that it decays to flat. */
export function corpusGaugeMaxHeight(state: CorpusGaugeState): number {
  let max = 0;
  for (const h of state.heights) max = Math.max(max, Math.abs(h));
  return max;
}

/** Spawn one bubble at the given spot (the component picks the
 * randoms; the model just places it). Returns false when the pool
 * is full. */
export function corpusGaugeSpawnBubble(
  state: CorpusGaugeState,
  x: number,
  y: number,
  r: number,
  speed: number,
  phase: number,
): boolean {
  const free = state.bubbles.find((b) => !b.alive);
  if (!free) return false;
  free.alive = true;
  free.x = x;
  free.y = y;
  free.r = r;
  free.speed = speed;
  free.phase = phase;
  return true;
}

/** Advance the bubbles one step: they rise, sway, and pop at the
 * surface, leaving a tiny dimple behind. Returns the live count. */
export function corpusGaugeAdvanceBubbles(
  state: CorpusGaugeState,
  height: number,
  dt: number,
  headroom = 0,
): number {
  const levelY = corpusGaugeLevelY(state.level, height, headroom);
  const column = (xFrac: number) =>
    clamp(
      Math.round(xFrac * (CORPUS_GAUGE_COLUMNS - 1)),
      0,
      CORPUS_GAUGE_COLUMNS - 1,
    );
  let alive = 0;
  for (const bubble of state.bubbles) {
    if (!bubble.alive) continue;
    // x is stored as a fraction of the vessel width (0..1) so the
    // model never needs the pixel width.
    bubble.y -= bubble.speed * dt;
    const i = column(bubble.x);
    if (bubble.y - bubble.r <= levelY + state.heights[i]) {
      bubble.alive = false;
      state.speeds[i] += bubble.r * 6;
    } else {
      alive++;
    }
  }
  return alive;
}

/** The liquid's clip-path: the surface polygon over the column
 * heights, closed at the vessel floor. `lift` raises the whole
 * surface — the meniscus rim rides CORPUS_GAUGE_RIM above it. */
export function corpusGaugeSurfacePolygon(
  heights: readonly number[],
  levelY: number,
  width: number,
  height: number,
  lift = 0,
): string {
  let points = "";
  for (let i = 0; i < CORPUS_GAUGE_COLUMNS; i++) {
    const x = (i / (CORPUS_GAUGE_COLUMNS - 1)) * width;
    const y = clamp(levelY + heights[i] - lift, -40, height + 40);
    points += `${x.toFixed(1)}px ${y.toFixed(1)}px,`;
  }
  return `polygon(${points}${width}px ${height + 40}px,0px ${height + 40}px)`;
}

/** Flat fill at a level — the reduced-motion render and the
 * pre-scroll-in rest state: no waves, no spring, just the glass
 * full to the corpus. `headroom` lifts the flat top off the rim
 * by that many px at full fill (proportional below it). */
export function corpusGaugeFlatPolygon(
  level: number,
  lift = 0,
  headroom = 0,
): string {
  const clamped = clamp(level, 0, 100);
  const top = 100 - clamped;
  const head = (headroom * clamped) / 100;
  return `polygon(0% calc(${top}% + ${head}px - ${lift}px),100% calc(${top}% + ${head}px - ${lift}px),100% 100%,0% 100%)`;
}
