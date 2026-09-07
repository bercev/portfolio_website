/** Camera t when each page section is in focus. */
export const SECTION_PATH_T = [0, 0.16, 0.32, 0.48, 0.62, 0.76, 0.88] as const;

/** Hard ceiling — arrival never parks at t = 1. */
export const PATH_END_T = 0.91;

/** Chapter sculptures along the path (About → Contact). Contact stays on-camera. */
export const STATION_PATH_T = [0.17, 0.33, 0.49, 0.63, 0.77, 0.86] as const;

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
 * Home uses scrollY so t=0 while the hero is at rest. Later chapters still
 * use the 38% focus probe so Experience→Contact keeps moving.
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
  const y = Number.isFinite(scrollY) ? Math.max(0, scrollY) : 0;
  const vh = Number.isFinite(viewportH) && viewportH > 0 ? viewportH : 1;
  const max = Number.isFinite(maxScroll) ? maxScroll : 0;
  const focusY = y + vh * JOURNEY_FOCUS_Y_RATIO;

  if (anchors.length < 2) {
    const raw = max > 0 ? y / max : 0;
    return clamp(raw * pathEndT, 0, pathEndT);
  }

  // Hold BERAT through small load-time scroll / chrome offsets.
  if (y < vh * 0.2 || focusY <= anchors[0].y) return anchors[0].t;

  const last = anchors[anchors.length - 1];
  if (focusY >= last.y) {
    const endY = Math.max(last.y + 1, (max > 0 ? max : last.y) + vh * JOURNEY_FOCUS_Y_RATIO);
    const u = clamp((focusY - last.y) / (endY - last.y), 0, 1);
    return lerp(last.t, pathEndT, u);
  }

  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    const probe = i === 0 ? y : focusY;
    if (probe <= b.y) {
      const u = (probe - a.y) / Math.max(1, b.y - a.y);
      return lerp(a.t, b.t, clamp(u, 0, 1));
    }
  }

  return pathEndT;
}

/**
 * Blend sculpture positions along t so the camera flies past chapters
 * instead of snapping to whichever station is nearest.
 */
export function interpolateStationPosition(
  t: number,
  stations: readonly JourneyVec3[],
  stationT: readonly number[] = STATION_PATH_T,
): JourneyVec3 | undefined {
  if (stations.length === 0) return undefined;
  const last = Math.min(stations.length, stationT.length) - 1;
  if (last < 0) return undefined;
  if (t <= stationT[0]) return stations[0];
  if (t >= stationT[last]) return stations[last];
  for (let i = 0; i < last; i++) {
    const a = stationT[i];
    const b = stationT[i + 1];
    if (t <= b) {
      const u = clamp((t - a) / Math.max(1e-6, b - a), 0, 1);
      return lerpVec(stations[i], stations[i + 1], u);
    }
  }
  return stations[last];
}

/** Aim at BERAT at rest, then glide past sculptures, then CONNECT. */
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
  const heroW = 1 - journeySmoothstep(t, 0, 0.14);
  const connectW = journeySmoothstep(t, 0.64, 0.86);
  const pathAhead = {
    x: cameraPos.x + tangent.x * 10,
    y: cameraPos.y + tangent.y * 10,
    z: cameraPos.z + tangent.z * 10,
  };
  // Keep most of the look on the path so chapter sculptures drift through
  // frame instead of becoming a hard cut to a new "background."
  const framed = stationPos
    ? {
        x: pathAhead.x * 0.72 + stationPos.x * 0.28,
        y: pathAhead.y * 0.78 + stationPos.y * 0.22,
        z: pathAhead.z * 0.7 + stationPos.z * 0.3,
      }
    : pathAhead;
  const mid = lerpVec(framed, textPos, heroW);
  return lerpVec(mid, arrivalPos, connectW);
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
