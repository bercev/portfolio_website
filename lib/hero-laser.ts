// Hero CTA laser pour (RUN10-LASER, reel 7 + React Bits Laser Flow) —
// pure timing/geometry model for a beam of FROST light that falls onto
// the hero CTA pill, splashes on its top edge, and pours over both
// corners. Rebuilt in our own Canvas2D stack from the React Bits
// LaserFlow source (MIT + Commons Clause, read in full 2026-11-12 from
// the registry `LaserFlow-TS-TW` — 978 lines, zero npm deps); nothing
// installed, no WebGL — the reference's mechanism is distilled, not
// ported: a vertical beam drops (INTRO_DROP), hits the surface, blooms
// with a damped spring, and light runs outward from the beam position
// to both corners (run fronts, exponential approach) and spills down
// the sides. The reference's mouse lens is NOT adopted — the site never
// follows the cursor; hover only re-runs the pour. Its dust/fog/
// streaks/dot-grid atmosphere is NOT adopted — the ribbons already
// carry the ambient light; the laser is the single sharp moment.
//
// The model's clock is ms since the component's intro started (the
// component starts that clock once the boot overlay is gone AND the
// CTA entrance has settled, so the fall is never hidden behind the
// boot). Two deliberate deviations from the reference, both measured
// from the hero's real geometry (v10iter44-before: only a 14px gap
// between the ticker and the pill):
//   1. The settled beam is a short stub (LASER_SETTLED_BEAM_PX) that
//      fades out above the pill — the reference's full-height settled
//      column would permanently tint the ticker line above the pill.
//   2. After impact the column drains down into the pill while the
//      pour runs, so the beam is a transient fall, not a standing
//      stripe over the hero copy.

/** Beam position across the pill, fraction (reference default 0.6). */
export const LASER_BEAM_X = 0.6;
/** Wait after mount before the beam falls — the CTA entrance is a
 * 0.21s delay + 0.95s rise, so the pill is opaque by ~1.16s. */
export const LASER_INTRO_DELAY_MS = 1200;
/** Beam fall duration (reference INTRO_DROP, 1.25s). */
export const LASER_INTRO_DROP_MS = 1250;
/** Intro settled at 5s (reference INTRO_END). */
export const LASER_INTRO_END_MS = 5000;
/** How far above the pill the settled beam stub reaches before it
 * fades to nothing — short enough to clear the ticker (14px gap). */
export const LASER_SETTLED_BEAM_PX = 28;
/** Rest breathing cycle, matching the CTA glow breathe (3.2s). */
export const LASER_BREATHE_MS = 3200;
/** Pour-front exponential rate (reference: 1 - exp(-1.15 * tau)). */
export const LASER_POUR_RATE = 1.15;
/** Corner spill length down the pill side once the fill completes. */
export const LASER_SPILL_PX = 26;
/** Splash flare lifetime after impact. */
export const LASER_SPLASH_MS = 600;
/** Beam column half-widths, px (canvas coords): soft halo / core. */
export const LASER_BEAM_HALO_PX = 23;
export const LASER_BEAM_CORE_PX = 4;

export type LaserPhase = "waiting" | "fall" | "pour" | "settled";

/** Phase of the intro at tMs since the intro clock started. */
export function laserPhase(tMs: number): LaserPhase {
  if (tMs < LASER_INTRO_DELAY_MS) return "waiting";
  const t = tMs - LASER_INTRO_DELAY_MS;
  if (t < LASER_INTRO_DROP_MS) return "fall";
  if (tMs < LASER_INTRO_END_MS) return "pour";
  return "settled";
}

export function laserSettled(tMs: number): boolean {
  return laserPhase(tMs) === "settled";
}

/** Seconds since impact (beam hit the pill top); 0 before impact. */
export function laserTauSeconds(tMs: number): number {
  return Math.max(
    0,
    (tMs - LASER_INTRO_DELAY_MS - LASER_INTRO_DROP_MS) / 1000,
  );
}

/**
 * Beam-head y in canvas coords (pillTopY = the pill's top edge, the
 * canvas top is y=0). Falls from the canvas top to the pill top over
 * the drop with the reference's ^1.3 curve; parks at the top before
 * the delay elapses, rests on the pill after impact.
 */
export function laserBeamFrontY(tMs: number, pillTopY: number): number {
  const t = tMs - LASER_INTRO_DELAY_MS;
  if (t <= 0) return 0;
  if (t >= LASER_INTRO_DROP_MS) return pillTopY;
  return pillTopY * Math.pow(t / LASER_INTRO_DROP_MS, 1.3);
}

/**
 * Beam column top y in canvas coords. During the fall the column spans
 * the whole drop; after impact it drains down into the pill over ~1s,
 * leaving only the settled stub above the pill top.
 */
export function laserBeamTopY(tMs: number, pillTopY: number): number {
  const tau = laserTauSeconds(tMs);
  if (tau <= 0) return 0;
  const drain = Math.min(1, tau / 1.0);
  return (pillTopY - LASER_SETTLED_BEAM_PX) * drain;
}

/** Damped spring (reference shape: omega 8, zeta 0.62) — bloom after impact. */
export function laserSpring(tauSeconds: number): number {
  if (tauSeconds <= 0) return 0;
  const omega = 8;
  const zeta = 0.62;
  const damped = omega * Math.sqrt(1 - zeta * zeta);
  return (
    1 -
    Math.exp(-zeta * omega * tauSeconds) *
      (Math.cos(damped * tauSeconds) +
        ((zeta * omega) / damped) * Math.sin(damped * tauSeconds))
  );
}

/** Bloom (0→1) after impact; 1 once settled. */
export function laserBloom(tMs: number): number {
  if (laserSettled(tMs)) return 1;
  return laserSpring(laserTauSeconds(tMs));
}

/**
 * Pour-front distance from the beam x toward one corner at a given
 * pour tau (reference run-front: reach * (1 - exp(-1.15 * tau))).
 * Asymptotic by design — the front eases into the corner and the
 * corner glow keeps rising smoothly past the settle instant, so
 * nothing pops when the phase flips to "settled". The `settled`
 * parameter is accepted for call-site symmetry and ignored.
 */
export function laserPourFrontAtTau(
  tauSeconds: number,
  reachPx: number,
  settled: boolean,
): number {
  void settled;
  if (tauSeconds <= 0) return 0;
  return Math.min(reachPx, reachPx * (1 - Math.exp(-LASER_POUR_RATE * tauSeconds)));
}

/** Pour front driven by the intro clock. */
export function laserPourFront(tMs: number, reachPx: number): number {
  return laserPourFrontAtTau(
    laserTauSeconds(tMs),
    reachPx,
    laserSettled(tMs),
  );
}

/**
 * Corner glow factor at a given pour tau: 0 until the front is 85%
 * of the way to its corner, then a smootherstep rise to 1 as it
 * arrives. Drives the corner pool brightness and the spill length —
 * both keep rising smoothly past the settle instant (asymptotic
 * front), so the settled state is reached without a step.
 */
export function laserPourFillAtTau(
  tauSeconds: number,
  reachPx: number,
  settled: boolean,
): number {
  void settled;
  const front = laserPourFrontAtTau(tauSeconds, reachPx, false);
  const u = Math.min(1, Math.max(0, (front / reachPx - 0.85) / 0.15));
  return u * u * u * (u * (u * 6 - 15) + 10);
}

/** Corner glow driven by the intro clock. */
export function laserPourFill(tMs: number, reachPx: number): number {
  return laserPourFillAtTau(
    laserTauSeconds(tMs),
    reachPx,
    laserSettled(tMs),
  );
}

/** Corner spill length down the pill side at a given pour tau. */
export function laserSpillAtTau(
  tauSeconds: number,
  reachPx: number,
  settled: boolean,
): number {
  return LASER_SPILL_PX * laserPourFillAtTau(tauSeconds, reachPx, settled);
}

/** Corner spill driven by the intro clock. */
export function laserSpill(tMs: number, reachPx: number): number {
  return laserSpillAtTau(
    laserTauSeconds(tMs),
    reachPx,
    laserSettled(tMs),
  );
}

/** Splash flare strength (1→0) over LASER_SPLASH_MS after impact. */
export function laserSplash(tMs: number): number {
  const tauMs = tMs - LASER_INTRO_DELAY_MS - LASER_INTRO_DROP_MS;
  if (tauMs < 0) return 0;
  if (tauMs >= LASER_SPLASH_MS) return 0;
  return 1 - tauMs / LASER_SPLASH_MS;
}

/** Rest breathing, 0..1 over the 3.2s glow cycle. */
export function laserBreath(tMs: number): number {
  return 0.5 + 0.5 * Math.sin((2 * Math.PI * tMs) / LASER_BREATHE_MS);
}

/**
 * Hover flash (reference flash shape): brightens the beam when a
 * hover re-runs the pour; decays over ~0.35s.
 */
export function laserHoverBoost(tauSeconds: number): number {
  if (tauSeconds <= 0) return 0;
  return Math.exp(-tauSeconds / 0.35) * (1 - Math.exp(-tauSeconds / 0.05));
}

/**
 * Which pour clock drives the fronts: a hover re-pour restarts them
 * from the beam, so while the hover pour is still running (its tau
 * below the settle tau) it wins over the intro clock; otherwise the
 * intro clock rules. hoverTauSeconds is null when no hover has fired.
 */
export function laserPourTau(
  introTauSeconds: number,
  hoverTauSeconds: number | null,
): number {
  const settleTau =
    (LASER_INTRO_END_MS - LASER_INTRO_DELAY_MS - LASER_INTRO_DROP_MS) /
    1000;
  if (hoverTauSeconds !== null && hoverTauSeconds < settleTau) {
    return hoverTauSeconds;
  }
  return introTauSeconds;
}
