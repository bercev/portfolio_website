// Pure helpers for the project-row liquid preview morph (RUN10-LIQUID):
// reel 7 liquid morph + the OpenMotion UI Morph example, rebuilt in the
// site's own Motion stack — no new dependency. While a project row is
// hovered/focused (desktop) or tapped (mobile), its rest preview morphs
// into a slowly wobbling liquid blob with an elastic overshoot scale,
// and a single shared liquid blob (one layoutId, reel-4 rule 19) glides
// between the rows' previews. Reduced motion renders the plain static
// preview — no morph, no blob, no glow (see project-preview-liquid.tsx).

/** Shared-element id: the one liquid blob behind the active preview. */
export const LIQUID_BLOB_LAYOUT_ID = "project-liquid-blob";

/**
 * Mobile tap pulse: how long the morph holds after a tap. 1000ms lets
 * the eye register the liquid moment — the elastic scale alone needs
 * ~0.5s to settle — before the preview returns to calm. (700ms was
 * too short to capture in a headless element screenshot: the probe
 * showed the morph running at 350ms, but the clip landed after the
 * pulse had expired — iter 25 mobile critic.)
 */
export const LIQUID_TAP_PULSE_MS = 1000;

/** Elastic overshoot scale of the morphed preview. */
export const LIQUID_SCALE = 1.045;

/**
 * Spring for the elastic scale: under-damped, so the preview visibly
 * overshoots and settles (liquid, not a plain ease).
 */
export const LIQUID_SCALE_SPRING = {
  type: "spring",
  stiffness: 260,
  damping: 13,
} as const;

/**
 * Spring for the shared blob's glide between rows: deliberately slow
 * (~0.7s settle) so the transit reads as light flowing down the
 * preview column, not a snap. At stiffness 200 the blob had nearly
 * arrived 250ms after the hover moved, so no still frame ever caught
 * it between the rows (iter 25 desktop critic).
 */
export const LIQUID_BLOB_SPRING = {
  type: "spring",
  stiffness: 140,
  damping: 17,
} as const;

/** One wobble cycle of the blob radius, in seconds. */
export const LIQUID_WOBBLE_S = 2.4;

/**
 * Organic border-radius keyframes for the liquid blob shape. Each is an
 * elliptical `horizontal% / vertical%` radius with four corners per side.
 * The corners stay in the 12–18% band on purpose, measured against the
 * two screenshots: the preview is a product screenshot, so the morph
 * must read as a wobbling liquid rectangle, not an oval mask. The
 * 28–42% band clipped mid-word in the Discord sidebar and cut the
 * Vitae "Why Vitae?" text at the corners (iter 25 own-eyes, fix round);
 * at 12–18% the corner arc clears both screenshots' edge text (Vitae's
 * bottom line sits 55px in / 33px up — the arc passes outside it — and
 * the Discord sidebar clears on its y-distance alone), while the
 * elastic scale + traveling blob + glow wash still carry the liquid
 * read. No two consecutive shapes share a corner value, so the wobble
 * still reads as liquid, not a pulse.
 */
export const LIQUID_BLOB_RADII: string[] = [
  "18% 12% 16% 14% / 12% 18% 14% 16%",
  "12% 18% 14% 16% / 18% 12% 16% 14%",
  "16% 14% 12% 18% / 14% 16% 12% 18%",
  "14% 16% 18% 12% / 16% 14% 18% 12%",
];

const BLOB_RADIUS_PATTERN =
  /^(\d+)% (\d+)% (\d+)% (\d+)% \/ (\d+)% (\d+)% (\d+)% (\d+)%$/;

/** True when the value is a well-formed elliptical blob radius. */
export function isLiquidBlobRadius(value: string): boolean {
  const match = BLOB_RADIUS_PATTERN.exec(value);
  if (!match) return false;
  return match
    .slice(1)
    .every((part) => Number(part) >= 0 && Number(part) <= 100);
}

/** The blob radius at step `index`, cycling through the keyframes. */
export function liquidBlobRadiusAt(index: number): string {
  const i =
    ((index % LIQUID_BLOB_RADII.length) + LIQUID_BLOB_RADII.length) %
    LIQUID_BLOB_RADII.length;
  return LIQUID_BLOB_RADII[i] as string;
}
