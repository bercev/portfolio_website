// Click pulse along the light field (RUN10-CLICK-PULSE, React Bits
// Soft Aurora behavior: "clicks send a pulse of light along it") —
// pure timing/geometry for the bright head + fading tail a pointer
// click sends traveling along the ribbon field's direction.
//
// Shape of one pulse (the react half of the charter's "light that
// flows, reacts, and carries the page"): the head is born at the
// click point and travels +x along the bright band's effective slope
// (band slope + chapter slope at spawn), so the streak runs parallel
// to the ribbons instead of cutting across them; the tail is a comet
// that grows behind the head as it travels (ghost k appears only
// once the head has passed k spacings — at spawn the pulse is a
// point, not a pre-drawn smear). Distinct from SPARKLE's hover
// burst (a radial burst AT the pointer) and from the ambient flare
// (a slow periodic crossing): this one is click-triggered, faster,
// bigger, brighter, and starts exactly where the pointer landed.
//
// The head reuses the flare sprite in the component (bright core +
// accent falloff, drawn sharp on the main canvas after the blur
// pass); this file owns only the motion model, so the travel is
// unit-testable and the verification probes can predict it exactly.

/** One live pulse. `slope` is frozen at spawn (band slope + chapter
 * slope then); `startT` is the pointerdown timestamp on the same
 * clock as the rAF timestamps the draw loop receives. */
export interface ClickPulse {
  /** Click point, viewport css px. */
  readonly x0: number;
  readonly y0: number;
  /** Effective band slope at spawn (bright band slope + chapter slope). */
  readonly slope: number;
  /** Pointerdown timestamp (performance.now() clock). */
  readonly startT: number;
  /** Narrow-screen profile (W < 700) — slower, smaller head. */
  readonly narrow: boolean;
}

/** One full pulse lifetime, milliseconds. At desktop speed the head
 * travels ~756px in that time — far enough that two frames ~1s apart
 * show it in wholly different places, short enough that it never
 * lingers as a second flare. */
export const CLICK_PULSE_DURATION_MS = 1800;
/** Head speed, css px per second. */
export const CLICK_PULSE_SPEED_DESKTOP_PX_S = 420;
export const CLICK_PULSE_SPEED_NARROW_PX_S = 300;
/** Fade-in at spawn (ms) — the head is born, not snapped on. */
export const CLICK_PULSE_FADE_IN_MS = 120;
/** Fraction of the lifetime over which the head fades out at the
 * end (the last 35% — a slow exhale, not a cutoff). */
export const CLICK_PULSE_FADE_OUT_FRACTION = 0.35;
/** Head radius, px — bigger than the ambient flare's 44/30 so the
 * click pulse reads as a distinct, brighter object, not a second
 * flare crossing by coincidence. */
export const CLICK_PULSE_HEAD_RADIUS_DESKTOP_PX = 52;
export const CLICK_PULSE_HEAD_RADIUS_NARROW_PX = 36;
/** Tail ghosts trailing the head. */
export const CLICK_PULSE_TAIL_COUNT = 8;
/** Ghost spacing along the travel line, px. */
export const CLICK_PULSE_TAIL_SPACING_DESKTOP_PX = 30;
export const CLICK_PULSE_TAIL_SPACING_NARROW_PX = 22;
/** Peak ghost alpha as a fraction of the head's alpha. */
export const CLICK_PULSE_TAIL_PEAK = 0.5;
/** Max concurrent pulses — a flurry of clicks never floods the
 * canvas; the oldest pulse is dropped, never queued. */
export const CLICK_PULSE_MAX_CONCURRENT = 4;

/** Energy floor for the pulse head + tail: the pulse must read as a
 * bright object on its own, wherever the click landed — unlike the
 * ambient flare, which rides the bright band and borrows the band's
 * light, the pulse can spawn in a dark gap where energy() falls to
 * ~0.25 (column 0.5 × vertical falloff 0.5) and a 0.25-alpha head is
 * a faint smudge, not a traveling light (iter-31 fix: the first
 * dark-region cast showed the head invisible at a glance). 0.75
 * keeps the head unmistakable in the column and the lower viewport
 * while leaving the margins (energy already 0.8–1.0) untouched; the
 * pulse lives 1.8s and crosses any word in ~0.25s, so the floor
 * never washes text. */
export const CLICK_PULSE_ENERGY_FLOOR = 0.75;

/** Floor the ribbon energy for the pulse: never dimmer than the
 * floor, never brighter than the raw energy. */
export function clickPulseEnergyAt(rawEnergy: number): number {
  return Math.max(rawEnergy, CLICK_PULSE_ENERGY_FLOOR);
}

export function clickPulseSpeed(narrow: boolean): number {
  return narrow
    ? CLICK_PULSE_SPEED_NARROW_PX_S
    : CLICK_PULSE_SPEED_DESKTOP_PX_S;
}

export function clickPulseHeadRadius(narrow: boolean): number {
  return narrow
    ? CLICK_PULSE_HEAD_RADIUS_NARROW_PX
    : CLICK_PULSE_HEAD_RADIUS_DESKTOP_PX;
}

export function clickPulseTailSpacing(narrow: boolean): number {
  return narrow
    ? CLICK_PULSE_TAIL_SPACING_NARROW_PX
    : CLICK_PULSE_TAIL_SPACING_DESKTOP_PX;
}

/** Whether a pulse of this age is still alive: not yet expired
 * (age < duration). A NEGATIVE age is alive too — it means the
 * pulse was spawned after the current frame's timestamp, which
 * happens whenever a pointerdown (performance.now() clock) lands
 * between a frame's vsync time and its callback execution: under
 * slow headless rAF the callback can execute ~100ms after its
 * timestamp, so the first draw after a click can carry a timestamp
 * BEFORE the click. The draw loop clamps such ages to 0 (below),
 * so the pulse is born on the next frame instead of being pruned
 * on the first — the pre-fix bug (iter-31 debug: the poll read "0"
 * on every run whose first post-click frame predated the click,
 * while the listener was provably registered). */
export function clickPulseActive(ageMs: number): boolean {
  return Number.isFinite(ageMs) && ageMs < CLICK_PULSE_DURATION_MS;
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Envelope 0→1→0 over the lifetime: smooth fade-in over the first
 * 120ms, hold at 1, smooth fade-out over the last 35%. 0 outside
 * the window (before spawn / after expiry). */
export function clickPulseEnvelope(ageMs: number): number {
  if (!clickPulseActive(ageMs)) return 0;
  const fadeOutStart =
    CLICK_PULSE_DURATION_MS * (1 - CLICK_PULSE_FADE_OUT_FRACTION);
  return (
    smooth(0, CLICK_PULSE_FADE_IN_MS, ageMs) *
    (1 - smooth(fadeOutStart, CLICK_PULSE_DURATION_MS, ageMs))
  );
}

/** The head's position + alpha at an age: born at the click point,
 * traveling +x at the profile speed with y following the frozen
 * slope, so the streak runs parallel to the ribbons. Alpha is the
 * envelope (peak 1.0 — the component multiplies by energy() and the
 * reveal factor, exactly as it does for the flare head). A negative
 * age (rAF timestamp lagging the pointerdown clock — see
 * clickPulseActive) clamps to 0: the head is born at the click
 * point, never behind it. */
export function clickPulseHead(
  pulse: ClickPulse,
  ageMs: number,
): { x: number; y: number; alpha: number } {
  const age = Math.max(0, ageMs);
  const dx = clickPulseSpeed(pulse.narrow) * (age / 1000);
  return {
    x: pulse.x0 + dx,
    y: pulse.y0 + pulse.slope * dx,
    alpha: clickPulseEnvelope(ageMs),
  };
}

/** Ghost k (1..TAIL_COUNT) at an age: it trails the head by
 * k spacings along the same slope line, and only exists once the
 * head has traveled past it — so the tail grows behind the head
 * instead of appearing as a pre-drawn smear at spawn. Alpha fades
 * with k (nearest ghost brightest) and follows the head envelope. */
export function clickPulseTail(
  pulse: ClickPulse,
  ageMs: number,
  k: number,
): { x: number; y: number; alpha: number } {
  const head = clickPulseHead(pulse, ageMs);
  const spacing = clickPulseTailSpacing(pulse.narrow);
  const behind = k * spacing;
  const traveled = head.x - pulse.x0;
  if (traveled < behind) return { x: head.x - behind, y: head.y - pulse.slope * behind, alpha: 0 };
  return {
    x: head.x - behind,
    y: head.y - pulse.slope * behind,
    alpha:
      head.alpha *
      CLICK_PULSE_TAIL_PEAK *
      (1 - k / (CLICK_PULSE_TAIL_COUNT + 1)),
  };
}

/** Spawn a pulse into the live set: appends, and drops the oldest
 * past the cap — a click flurry never floods the canvas. Returns a
 * new array; the input is untouched. */
export function clickPulseSpawn(
  pulses: ReadonlyArray<ClickPulse>,
  next: ClickPulse,
): ClickPulse[] {
  const out = [...pulses, next];
  while (out.length > CLICK_PULSE_MAX_CONCURRENT) out.shift();
  return out;
}
