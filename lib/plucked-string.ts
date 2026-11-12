// Plucked-string physics (RUN10-PLUCK) — the pure model behind the
// 404 heading's pluckable light string.
//
// Rebuilt in our own stack from Kokonut UI's PluckedText
// (components/kokonutui/plucked-text.tsx, v1.0.0, 2026-10-14,
// @dorianbaffier, MIT — read in full 2026-11-12; zero new deps,
// nothing installed, no OSV gate needed). The mechanism: the string
// is a sum of its standing waves (modes), each a damped oscillator
// solved exactly, so it can't blow up at any frame rate; a grab
// pulls it into a V (written as a triangle's Fourier modes), a
// release lets it ring, and a cursor sweep across the line strums
// it. A real string keeps its wave speed, so a longer one rings
// lower; high modes damp faster, so a pluck starts sharp and rounds
// off into a slow sway.
//
// Differences from the reference, all in this file so the component
// stays a thin shell: the model is split out for unit tests and for
// the verification probes (which predict the ring exactly); the
// FROST restyle (accent string, glow) lives in the component + CSS,
// not here.

/** One standing-wave mode of the string. */
export interface PluckMode {
  /** Current displacement amplitude. */
  q: number;
  /** Current velocity. */
  v: number;
  /** Angular frequency, rad/s. */
  omega: number;
  /** Damping coefficient, 1/s. */
  gamma: number;
  /** Damped angular frequency, rad/s. */
  damped: number;
}

/** Wave speed along the string, px/s, at tension 1. */
export const PLUCK_WAVE_SPEED_PX_S = 1500;
/** Most modes ever simulated — more would alias on a 60 Hz screen. */
export const PLUCK_MAX_MODES = 24;
/** No mode may vibrate faster than this many times a second. */
export const PLUCK_MAX_MODE_HZ = 22;
/** Damping: every mode loses some energy, high ones much faster. */
export const PLUCK_DAMP_BASE = 0.9;
export const PLUCK_DAMP_HIGH = 0.012;
/** Sample spacing along the string for the drawn path, px. */
export const PLUCK_STEP_PX = 6;
/** Displacements flatten out past this fraction of the font size,
 * so a hard pull bends the line without throwing letters off it. */
export const PLUCK_MAX_SWAY = 0.6;
/** How much of a sweep's vertical speed reaches the string. */
export const PLUCK_STRUM_GAIN = 0.55;
/** Strum speed clamp, px/s. */
export const PLUCK_MAX_STRUM_SPEED = 2400;
/** Below this energy the string is at rest and the loop stops. */
export const PLUCK_REST_ENERGY = 0.02;
/** Letters tilt with the string, a little less than its full slope. */
export const PLUCK_TILT = 0.85;
/** Reduced motion: no ringing — a release eases back flat over
 * this long, cubic, like the reference. */
export const PLUCK_RM_EASE_BACK_MS = 260;
/** The greeting strum on first view: a soft upward pull at 30%
 * along the string, half the max swing — it shows the string can
 * move without shouting. */
export const PLUCK_GREET_APEX_FRACTION = 0.3;
export const PLUCK_GREET_SWAY_FRACTION = 0.5;
/** Default string tension — higher rings faster, settles sooner. */
export const PLUCK_TENSION = 1;

/** How many modes a string of this length rings at this tension:
 * at least 4, at most PLUCK_MAX_MODES, and only modes slow enough
 * to survive a 60 Hz screen. */
export function pluckModeCount(length: number, tension: number): number {
  const f0 = (PLUCK_WAVE_SPEED_PX_S * tension) / (2 * length);
  return Math.max(
    4,
    Math.min(PLUCK_MAX_MODES, Math.floor(PLUCK_MAX_MODE_HZ / f0)),
  );
}

/** Fresh modes for a string of this length and tension, carrying
 * over any previous displacement/velocity per mode index so a
 * resize doesn't snap the string flat mid-ring. */
export function pluckCreateModes(
  length: number,
  tension: number,
  prev: ReadonlyArray<PluckMode> = [],
): PluckMode[] {
  const f0 = (PLUCK_WAVE_SPEED_PX_S * tension) / (2 * length);
  const count = pluckModeCount(length, tension);
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    const omega = 2 * Math.PI * f0 * n;
    const gamma =
      (PLUCK_DAMP_BASE + PLUCK_DAMP_HIGH * n * n) * Math.sqrt(tension);
    return {
      q: prev[index]?.q ?? 0,
      v: prev[index]?.v ?? 0,
      omega,
      gamma,
      damped: Math.sqrt(Math.max(omega * omega - gamma * gamma, 1)),
    };
  });
}

/** Advance one damped oscillator by `dt` seconds, exactly. */
export function pluckStepMode(mode: PluckMode, dt: number): void {
  const { q, v, omega, gamma, damped } = mode;
  const decay = Math.exp(-gamma * dt);
  const c = Math.cos(damped * dt);
  const s = Math.sin(damped * dt);
  mode.q = decay * (q * c + ((v + gamma * q) / damped) * s);
  mode.v = decay * (v * c - ((omega * omega * q + gamma * v) / damped) * s);
}

/** The string pulled into a V with its apex at `apex` and height
 * `height`, written as standing waves. Cutting the series short
 * rounds the corner. */
export function pluckTriangleModes(
  modes: PluckMode[],
  length: number,
  apex: number,
  height: number,
): void {
  const d = Math.min(Math.max(apex, 1), length - 1);
  modes.forEach((mode, index) => {
    const n = index + 1;
    mode.q =
      ((2 * height * length * length) /
        (n * n * Math.PI * Math.PI * d * (length - d))) *
      Math.sin((n * Math.PI * d) / length);
    mode.v = 0;
  });
}

/** Rubber band: grows like `x` near zero and never past `max`. */
export function pluckSoften(x: number, max: number): number {
  return max * Math.tanh(x / max);
}

/** Displacement of the string where `basis` (the mode sines at one
 * sample point) was sampled. */
export function pluckSumAt(modes: ReadonlyArray<PluckMode>, basis: Float64Array): number {
  let y = 0;
  for (let i = 0; i < modes.length; i++) {
    y += modes[i].q * basis[i];
  }
  return y;
}

/** Total energy of the string — the rest test for the loop. */
export function pluckEnergy(modes: ReadonlyArray<PluckMode>): number {
  return modes.reduce(
    (e, m) => e + m.v * m.v + m.omega * m.omega * m.q * m.q,
    0,
  );
}

/** Settle every mode to zero. */
export function pluckSettle(modes: PluckMode[]): void {
  for (const mode of modes) {
    mode.q = 0;
    mode.v = 0;
  }
}

/** The string's max swing in px at this font size — the softening
 * ceiling the component passes to pluckSoften. */
export function pluckSwingPx(fontSizePx: number): number {
  return fontSizePx * PLUCK_MAX_SWAY;
}
