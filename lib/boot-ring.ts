// Boot overlay light ring (RUN10-BOOT, reel 3 + designeer Gradient Spin
// + Kokonut FB-01 Promise Toast "the ring spins while it works" +
// Amicro Breathe Ring) — pure timing/geometry model for the first-visit
// boot overlay: a spinning gradient light ring with a breathing glow
// heart, shown while the particle BERAT gathers behind it. Rebuilt in
// our own stack, zero deps; the references' mechanisms are distilled,
// not ported: Gradient Spin's spinning gradient indicator, the Promise
// Toast's work-ring, the Breathe Ring's glow pulse — no cursor follow
// (the site never follows the cursor), no toast chrome, no text lines.
//
// The overlay replaces the run-7 BIOS boot (mono hardware-check lines
// on black). The dismissal contract is unchanged: 2600ms auto-dismiss,
// 450ms fade, click/tap to skip, skipped on repeat visits
// (localStorage `bercev-has-booted`) and under reduced motion. The
// phone skip is GONE (RUN10-BOOT): the BIOS text wall was the reason
// phones skipped the theater (research iter 30); a light ring is the
// gathering moment itself, and it shows at 390px too — see
// bootExpected in components/effects/light-ribbons.tsx, which mirrors
// this gate for the opening-reveal wait.

/** Auto-dismiss: the overlay starts fading at this age (ms). */
export const BOOT_DURATION_MS = 2600;
/** Fade-out length (ms) once the dismiss starts. */
export const BOOT_FADE_MS = 450;
/** Unmounted at duration + fade (ms) in the normal path. */
export const BOOT_UNMOUNT_MS = BOOT_DURATION_MS + BOOT_FADE_MS;
/** One full ring rotation (ms) — ~1.86 turns inside the 2.6s window,
// so any two frames ~700ms apart show the bright arc on opposite
// sides. */
export const BOOT_RING_SPIN_MS = 1400;
/** Glow-heart breathe cycle (ms), synced to the spin. */
export const BOOT_BREATHE_MS = 1400;
/** Ring diameter (px) at desktop width. */
export const BOOT_RING_SIZE_PX = 120;
/** Ring diameter (px) at <=700px — the 390px size. */
export const BOOT_RING_SIZE_NARROW_PX = 96;
/** Ring stroke thickness (px). */
export const BOOT_RING_THICKNESS_PX = 3;
/** Clearance (px) the ring + its glow halo needs around itself inside
 * the viewport, so the ring never crowds the viewport edge. */
export const BOOT_RING_CLEARANCE_PX = 48;
/** Quiet label under the ring. */
export const BOOT_RING_LABEL = "gathering light";

/** Ring rotation (degrees, 0–360) at tMs since the overlay mounted. */
export function bootRingAngleAt(tMs: number): number {
  const t = ((tMs % BOOT_RING_SPIN_MS) + BOOT_RING_SPIN_MS) % BOOT_RING_SPIN_MS;
  return (t / BOOT_RING_SPIN_MS) * 360;
}

/** Glow-heart breathe (0–1, 1 = full glow) at tMs since mount — a
 * sine breathe, full at the quarter-turns, dim at the half-turns. */
export function bootBreatheAt(tMs: number): number {
  const phase = (tMs % BOOT_BREATHE_MS) / BOOT_BREATHE_MS;
  return 0.55 + 0.45 * Math.sin(phase * Math.PI * 2);
}

/** Whether the overlay is still mounted at tMs since mount. */
export function bootOverlayVisible(tMs: number): boolean {
  return tMs < BOOT_UNMOUNT_MS;
}

/** Whether a ring of diameter sizePx fits viewportWidthPx with the
 * glow clearance on both sides. */
export function bootRingFitsViewport(
  sizePx: number,
  viewportWidthPx: number,
): boolean {
  return sizePx + BOOT_RING_CLEARANCE_PX * 2 <= viewportWidthPx;
}
