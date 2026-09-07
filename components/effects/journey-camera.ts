/** Camera t when each page section is in focus. */
export const SECTION_PATH_T = [0, 0.16, 0.32, 0.48, 0.62, 0.76, 0.88] as const;

/** Hard ceiling — arrival never parks at t = 1. */
export const PATH_END_T = 0.91;

/** Viewport probe used to map later chapters; hero must not use this at rest. */
export const JOURNEY_FOCUS_Y_RATIO = 0.38;

export type JourneyVec3 = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

export type JourneyScrollAnchor = {
  readonly y: number;
  readonly t: number;
};

export type JourneyLookName = "berat" | "path" | "connect";

function clamp(value: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpVec(a: JourneyVec3, b: JourneyVec3, t: number): JourneyVec3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

/** THREE.MathUtils.smoothstep(x, min, max) — x is the value, not the edges. */
export function journeySmoothstep(x: number, min: number, max: number) {
  if (x <= min) return 0;
  if (x >= max) return 1;
  const t = (x - min) / (max - min);
  return t * t * (3 - 2 * t);
}

/**
 * Map page scroll to path t using section tops so later chapters keep travel.
 *
 * Hero hold: t stays at the home anchor while the page is still at rest
 * (scrollY ≈ 0). Using the 38% focus probe on home interpolates toward About
 * immediately and parks the camera past BERAT.
 */
export function mapSectionScrollToJourneyT({
  scrollY,
  viewportH,
  maxScroll,
  anchors,
  pathEndT = PATH_END_T,
}: {
  readonly scrollY: number;
  readonly viewportH: number;
  readonly maxScroll: number;
  readonly anchors: readonly JourneyScrollAnchor[];
  readonly pathEndT?: number;
}): number {
  const y = Number.isFinite(scrollY) ? scrollY : 0;
  const vh = Number.isFinite(viewportH) && viewportH > 0 ? viewportH : 1;
  const max = Number.isFinite(maxScroll) ? maxScroll : 0;
  const focusY = y + vh * JOURNEY_FOCUS_Y_RATIO;

  if (anchors.length < 2) {
    const raw = max > 0 ? y / max : 0;
    return clamp(raw * pathEndT, 0, pathEndT);
  }

  if (focusY <= anchors[0].y) return anchors[0].t;

  const last = anchors[anchors.length - 1];
  if (focusY >= last.y) {
    const endY = Math.max(last.y + 1, (max > 0 ? max : last.y) + vh * JOURNEY_FOCUS_Y_RATIO);
    const u = clamp((focusY - last.y) / (endY - last.y), 0, 1);
    return lerp(last.t, pathEndT, u);
  }

  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (focusY <= b.y) {
      const u = (focusY - a.y) / Math.max(1, b.y - a.y);
      return lerp(a.t, b.t, clamp(u, 0, 1));
    }
  }

  return pathEndT;
}

/**
 * Aim the camera. At t≈0 this currently looks one unit along the path tangent
 * (empty space) instead of at the BERAT wordmark.
 */
export function resolveJourneyLookTarget({
  t,
  cameraPos,
  tangent,
  textPos,
  arrivalPos,
  stationPos,
}: {
  readonly t: number;
  readonly cameraPos: JourneyVec3;
  readonly tangent: JourneyVec3;
  readonly textPos: JourneyVec3;
  readonly arrivalPos: JourneyVec3;
  readonly stationPos?: JourneyVec3;
}): JourneyVec3 {
  void t;
  void textPos;
  void arrivalPos;
  void stationPos;
  return {
    x: cameraPos.x + tangent.x,
    y: cameraPos.y + tangent.y,
    z: cameraPos.z + tangent.z,
  };
}

export function journeyLookName({
  look,
  textPos,
  arrivalPos,
}: {
  readonly look: JourneyVec3;
  readonly textPos: JourneyVec3;
  readonly arrivalPos: JourneyVec3;
}): JourneyLookName {
  const dist = (a: JourneyVec3, b: JourneyVec3) =>
    Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  if (dist(look, textPos) <= 2.5) return "berat";
  if (dist(look, arrivalPos) <= 16) return "connect";
  return "path";
}
