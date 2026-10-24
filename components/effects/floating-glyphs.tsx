"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import { usePalette } from "@/components/providers/palette-provider";
import { MOBILE_QUERY, REDUCED_MOTION_QUERY } from "@/lib/effect-policy";
import { BLUE_NOISE_128, blueNoiseThreshold } from "@/lib/blue-noise";
import { answerSpinEnvelope, answerWireEnvelope, ANSWER_SPIN_RATE, ANSWER_WIRE_ALPHA, boundaryShapeGlyph, bustWipeDrop, ditherDissolveLevel, fbm2, inspectFocusEnvelope, lightWashFalloff, objectDefocus, objectPrecession, pingEnvelope, pingRadius01, scrollShared, scrollSnapshot, subscribeScrollSnapshot, useScrollBlur, velocityStretch, chapterCrossingScrollY, wipeGlyphChar, wipeRawFrac, wipeSweepThreshold, WIPE_FBM_WEIGHT, WIPE_NOISE_PX, WIPE_SWEEP_BIAS, CHAPTER_IDS, OBJECT_WINDOWS } from "@/lib/scroll-fx";

/**
 * FloatingGlyphs — the site background since the 2026-10-22 simplification
 * (user direction: drop the complex 3D journey scene; "just floating ascii
 * or glyph effects... make them rotating and stuff").
 *
 * A single calm Canvas2D layer: ASCII + geometric glyphs in three depth
 * layers drift slowly, each spinning on its own axis, with a whisper of
 * pointer/scroll parallax. The field's character set follows the active
 * chapter (math over publications, code over experience — dissolved
 * per-glyph across crossings), so each section has a quiet texture
 * identity while rest stays calm. Around chapter crossings a noise wipe sweeps
 * the field's dialect continuously with scroll position — an organic
 * hard-edged front (fbm noise + a downward sweep bias), a pure function of
 * scrollY so scrolling back reverses it exactly. Colors are probed from the live theme tokens
 * (foreground for the dim majority, --accent-neon for the accents) so it
 * follows palettes and light/dark without a rebuild.
 *
 * Contracts preserved from the journey scene it replaced:
 * - It claims the page background via documentElement[data-journey=
 *   "active"] — the same signal EffectStage has always used to keep the
 *   Neural Ink shader backdrop from stacking under a claimed background.
 *   (The attribute name is historical; it means "background claimed".)
 * - While animating it sets documentElement[data-ascii="active"], which is
 *   what the ASCII portrait bust keys its visibility on.
 * - Under prefers-reduced-motion it paints ONE static frame and does NOT
 *   set data-ascii (the bust is intentionally absent in the static
 *   profile — audited behavior, iter 26).
 */

const GLYPHS = [
  "@", "#", "%", "&", "*", "+", "×", "=", "<", ">", "/", "|",
  ":", "·", "°", "○", "◇", "△", "□", "§", "~", "^", "0", "1",
  "8", "X", "S", "{", "}", "[", "]",
] as const;

const LAYER_SIZE = [12, 17, 26] as const; // far / mid / near, CSS px
const LAYER_ALPHA: Array<[number, number]> = [
  [0.06, 0.13],
  [0.10, 0.21],
  [0.16, 0.32],
];
const LAYER_PARALLAX = [2, 5, 10] as const;
/**
 * Scroll dive: px of background travel per px of document scroll, per
 * layer. Near layers rush past with scroll depth, far layers lag — so
 * scrolling reads as the camera pushing through the field rather than
 * the field sitting still.
 */
const LAYER_SCROLL = [0.06, 0.16, 0.32] as const;

/**
 * Chapter-entry ping (run-2 IDEA iter 8): one-shot dither ring beat on
 * chapter crossings — duration of the wavefront, minimum seconds
 * between pings (a fast fling fires at most one), the ring's max radius
 * as a fraction of the viewport's short side, the band width around the
 * ring front, and the peak alpha lift for a glyph exactly on the front.
 */
const PING_DURATION_S = 1.6;
const PING_COOLDOWN_S = 1.4;
const PING_RADIUS_FRAC = 0.75;
const PING_BAND_PX = 44;
const PING_BOOST_MAX = 0.3;

/**
 * Chapter-reactive glyph vocabulary (run-2 IDEA iter 7): the field
 * speaks each chapter's language — math over publications, code over
 * experience — dissolved per-glyph across chapter crossings (the
 * dither-dissolve grammar from iter 4, applied to characters). Home
 * keeps the base identity mix. All sets stay monospace-safe.
 */
const VOCAB: ReadonlyArray<ReadonlyArray<string>> = [
  GLYPHS, // home — the identity mix
  ["○", "◇", "·", ":", ";", "+", "~", "°", "^", "-", "_", ",", ".", "'", '"', "(", ")", "?", "!", "/"], // about — prose texture
  ["∑", "∆", "∂", "∫", "√", "∞", "λ", "µ", "π", "≈", "≠", "±", "×", "÷", "∝", "∈", "∀", "∃", "°", "·", "+", "-", "=", "/"], // publications — math
  ["{", "}", "[", "]", "<", ">", "/", "=", ";", ":", "!", "?", "$", "%", "#", "&", "*", "_", "-", "+", "|", "."], // experience — code
  ["#", "$", "%", "@", "&", "*", "+", "=", ">", "<", "_", "/", "|", "-", "!", ":", "0", "1", "X", "S"], // projects — shipping
  ["○", "◇", "△", "□", "×", "+", "*", "#", "°", "·", ":", ";", "=", "<", ">", "/", "|", "-", "_", "0", "1"], // skills — geometric
  ["@", "#", "~", "_", "&", "%", "$", "*", "+", "=", ":", ";", "?", "!", "/", "-", ".", "0", "1", "X"], // contact — reach-out
];

interface Glyph {
  ch: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  layer: 0 | 1 | 2;
  accent: boolean;
  alpha: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function probeTokenColor(token: string): Rgb | null {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const raw = getComputedStyle(probe).color;
  probe.remove();
  const m = raw.match(/[\d.]+/g);
  if (!m || m.length < 3) return null;
  // color(srgb r g b) serializes channels as 0..1 floats; rgb() as 0..255.
  const scale = raw.startsWith("color(") ? 255 : 1;
  return {
    r: Math.round(parseFloat(m[0]) * scale),
    g: Math.round(parseFloat(m[1]) * scale),
    b: Math.round(parseFloat(m[2]) * scale),
  };
}

function rgba(c: Rgb, a: number): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${a.toFixed(3)})`;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/* ------------------------------------------------------------------ */
/* Scroll-reactive 3D ASCII objects (v2, 2026-10-23)                   */
/*                                                                     */
/* Three objects in the same ASCII/dither language as the glyph      */
/* field, drawn onto this same canvas so the background stays one    */
/* coherent layer (one cadence, one scroll blur). Each lives in a    */
/* scroll-progress window — dissolving in through ordered dither,   */
/* rotating with scroll depth plus a slow idle spin, GLIDING across */
/* its window (scroll dive: drifting toward the viewer and growing  */
/* ~15%), dissolving out — anchored at the viewport's quiet corners */
/*   torus  — bottom-right, hero → publications (progress .02–.48)    */
/*   sphere — top-right, experience → projects (progress .38–.78)    */
/*   cube   — bottom-right, skills → contact (progress .66–end)      */
/* Mobile keeps only the torus, smaller. Objects are drawn only on   */
/* animated frames (dt > 0), so the reduced-motion still stays the   */
/* plain glyph field it has always been.                             */
/* ------------------------------------------------------------------ */

const OBJ_RAMP = ".,-~:;=!*#$@";
const OBJ_FONT = '"JetBrains Mono", ui-monospace, monospace';

/** Alpha envelope for an object's scroll window [a, b] with soft edges. */
function windowAlpha(p: number, a: number, b: number): number {
  const F = 0.07;
  const s = (x: number) => {
    const t = Math.min(1, Math.max(0, x));
    return t * t * (3 - 2 * t);
  };
  return s((p - a + F) / (2 * F)) * (1 - s((p - b + F) / (2 * F)));
}

/**
 * Scroll dive for the 3D objects: instead of hovering in place, each
 * object glides across its scroll window — drifting toward the viewer
 * and growing ~15% — so scroll moves it through space, not just rotates
 * it. Pose is (x, y) as viewport fractions + size multiplier, eased
 * across the window. All anchors stay in the quiet corners so objects
 * never park behind dense text.
 */
function windowT(p: number, a: number, b: number): number {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

interface DivePose {
  x0: number;
  y0: number; // anchor at window start (viewport fractions)
  x1: number;
  y1: number; // anchor at window end
  s0: number;
  s1: number; // size multiplier start -> end
}

function divePose(p: DivePose, t: number, w: number, h: number) {
  return {
    cx: w * (p.x0 + (p.x1 - p.x0) * t),
    cy: h * (p.y0 + (p.y1 - p.y0) * t),
    s: p.s0 + (p.s1 - p.s0) * t,
  };
}

/**
 * Offscreen tile for one 3D object (run-2 iter 3, depth-of-field
 * compositing): the object renders here at device pixels, then blits
 * onto the object layer with a per-object defocus blur. `half` is the
 * logical half-extent of the tile (objects are drawn centered on it);
 * `region` is the full logical size (the drawImage dest at rest).
 */
interface ObjSlot {
  cv: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  half: number;
  region: number;
}

// The [a, b] scroll windows for these poses are the single source of
// truth in lib/scroll-fx.ts OBJECT_WINDOWS (the bust's object-attention
// glance reads the same windows) — the composites below reference them.
const TORUS_DIVE: DivePose = {
  x0: 0.875, y0: 0.82, x1: 0.8, y1: 0.58, s0: 1, s1: 1.16,
};
const SPHERE_DIVE: DivePose = {
  x0: 0.9, y0: 0.14, x1: 0.86, y1: 0.38, s0: 1, s1: 1.12,
};
const CUBE_DIVE: DivePose = {
  x0: 0.875, y0: 0.82, x1: 0.8, y1: 0.6, s0: 1, s1: 1.15,
};
const TORUS_DIVE_MOBILE: DivePose = {
  x0: 0.8, y0: 0.8, x1: 0.74, y1: 0.62, s0: 1, s1: 1.1,
};

/** Classic donut: parametric torus, per-cell z-buffer, luminance ramp. */
function drawTorus(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  A: number,
  B: number,
  color: Rgb,
  alphaScale: number,
) {
  const fontSize = Math.max(8, radius * 0.11);
  const cw = fontSize * 0.62;
  const chh = fontSize * 1.05;
  const half = radius * 1.45;
  const cols = Math.max(1, Math.ceil((half * 2) / cw));
  const rows = Math.max(1, Math.ceil((half * 2) / chh));
  const cells = new Map<number, { lum: number; ooz: number }>();
  const sinA = Math.sin(A), cosA = Math.cos(A);
  const sinB = Math.sin(B), cosB = Math.cos(B);
  const R1 = 1, R2 = 0.44, K2 = 5;
  for (let j = 0; j < Math.PI * 2; j += 0.13) {
    const sinJ = Math.sin(j), cosJ = Math.cos(j);
    for (let i = 0; i < Math.PI * 2; i += 0.045) {
      const sinI = Math.sin(i), cosI = Math.cos(i);
      const circX = R1 + R2 * cosJ;
      const circY = R2 * sinJ;
      const x = circX * (cosB * cosI + sinA * sinB * sinI) - circY * cosA * sinB;
      const y = circX * (sinB * cosI - sinA * cosB * sinI) + circY * cosA * cosB;
      const z = K2 + cosA * circX * sinI + circY * sinA;
      const ooz = 1 / z;
      const L =
        cosJ * cosI * sinB - cosA * cosJ * sinI - sinA * sinJ +
        cosB * (cosA * sinJ - cosI * sinA * sinJ);
      if (L <= 0.03) continue;
      const sx = cx + x * ooz * radius * 3.4;
      const sy = cy + y * ooz * radius * 3.4;
      const col = Math.floor((sx - (cx - half)) / cw);
      const row = Math.floor((sy - (cy - half)) / chh);
      if (col < 0 || row < 0 || col >= cols || row >= rows) continue;
      const key = row * cols + col;
      const prev = cells.get(key);
      if (!prev || ooz > prev.ooz) cells.set(key, { lum: L, ooz });
    }
  }
  ctx.font = `${fontSize}px ${OBJ_FONT}`;
  // Shape-aware print (run-2 iter 15, Codrops Lunardi): boundary cells
  // get edge-following glyphs instead of the luminance ramp — the
  // character follows the ring's curve instead of dissolving into
  // horizontal tone streaks. Alpha stays tone-driven (lighting reads).
  const occ = new Uint8Array(cols * rows);
  for (const key of cells.keys()) occ[key] = 1;
  for (const [key, cell] of cells) {
    const col = key % cols;
    const row = Math.floor(key / cols);
    const lum01 = Math.min(1, cell.lum / 1.15);
    // Density-aware (the cube-rim lesson): the directional set only
    // spans thin/mid ink, so it applies where the ramp would print
    // thin/mid chars (lum01 < 0.6 → `.,-~:;=`). Brighter boundary cells
    // keep their dense ramp glyphs — specular accents, not tone-noise.
    const ch =
      (lum01 < 0.6 ? boundaryShapeGlyph(occ, cols, rows, col, row) : null) ??
      OBJ_RAMP[Math.min(OBJ_RAMP.length - 1, Math.floor(lum01 * OBJ_RAMP.length))];
    ctx.fillStyle = rgba(color, alphaScale * (0.12 + 0.88 * lum01));
    ctx.fillText(
      ch,
      cx - half + (col + 0.5) * cw,
      cy - half + (row + 0.5) * chh,
    );
  }
}

/** Fibonacci point sphere; luminance posterized to 6 levels = the dither read. */
function drawSphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rotY: number,
  tiltX: number,
  color: Rgb,
  alphaScale: number,
) {
  // Sparse on purpose: at mid-page depths the background blur runs
  // 2.5-4px, so glyphs need ~12px spacing and a large face to keep
  // reading as a dithered point sphere instead of melting into a blob.
  const fontSize = Math.max(11, radius * 0.22);
  const N = Math.round(radius * radius * 0.044);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const cosX = Math.cos(tiltX), sinX = Math.sin(tiltX);
  const lx = -0.45, ly = 0.55, lz = 0.7;
  ctx.font = `${fontSize}px ${OBJ_FONT}`;
  for (let k = 0; k < N; k++) {
    const y0 = 1 - (k / (N - 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y0 * y0));
    const th = golden * k;
    const x0 = Math.cos(th) * rad;
    const z0 = Math.sin(th) * rad;
    const x1 = x0 * cosY + z0 * sinY;
    const z1 = z0 * cosY - x0 * sinY;
    const y2 = y0 * cosX - z1 * sinX;
    const z2 = y0 * sinX + z1 * cosX;
    if (z2 <= 0.02) continue; // back hemisphere
    const L = x1 * lx + y2 * ly + z2 * lz;
    if (L <= 0.02) continue;
    const q = Math.round(Math.min(1, L) * 5) / 5;
    if (q <= 0) continue;
    const ch =
      OBJ_RAMP[Math.min(OBJ_RAMP.length - 1, Math.floor(q * OBJ_RAMP.length))];
    ctx.fillStyle = rgba(color, alphaScale * (0.15 + 0.85 * q));
    ctx.fillText(ch, cx + x1 * radius, cy + y2 * radius);
  }
}

const CUBE_FACES: Array<{
  n: [number, number, number];
  u: [number, number, number];
  v: [number, number, number];
}> = [
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
];

function rot3(
  x: number, y: number, z: number,
  cosY: number, sinY: number, cosX: number, sinX: number,
): [number, number, number] {
  const x1 = x * cosY + z * sinY;
  const z1 = z * cosY - x * sinY;
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;
  return [x1, y2, z2];
}

/** Glyph-surfaced cube: each visible face is a flat-shaded glyph grid. */
function drawCube(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  rotY: number,
  rotX: number,
  color: Rgb,
  alphaScale: number,
) {
  const fontSize = Math.max(8, size * 0.34);
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const lx = -0.45, ly = 0.55, lz = 0.7;
  const STEPS = 6;
  ctx.font = `${fontSize}px ${OBJ_FONT}`;
  for (const f of CUBE_FACES) {
    const [nx, ny, nz] = rot3(f.n[0], f.n[1], f.n[2], cosY, sinY, cosX, sinX);
    if (nz <= 0.03) continue; // facing away
    const L = Math.max(0, nx * lx + ny * ly + nz * lz);
    const lum01 = 0.2 + 0.8 * Math.min(1, L);
    const ch =
      OBJ_RAMP[Math.min(OBJ_RAMP.length - 1, Math.floor(lum01 * OBJ_RAMP.length))];
    // Edge points burn brighter than face interiors — at the deep-scroll
    // blur levels (3.5-5px) flat face shading melts into a smudge, but a
    // bright rim keeps the cube's geometry legible. (Run-2 iter 15:
    // a direction-following thin-glyph rim was tried here and reverted —
    // it traded the rim's dense `#`/`@` ink for thin strokes and the cube
    // went faint. The rim's job is brightness, not direction.)
    const edgeCh =
      OBJ_RAMP[
        Math.min(OBJ_RAMP.length - 1, Math.floor(Math.min(1, lum01 + 0.25) * OBJ_RAMP.length))
      ];
    for (let a = 0; a <= STEPS; a++) {
      for (let b = 0; b <= STEPS; b++) {
        const s = -0.84 + (a / STEPS) * 1.68;
        const t = -0.84 + (b / STEPS) * 1.68;
        const edge = a === 0 || b === 0 || a === STEPS || b === STEPS;
        ctx.fillStyle = rgba(
          color,
          alphaScale * (edge ? 0.85 : 0.25 + 0.55 * lum01),
        );
        const [rx, ry] = rot3(
          f.n[0] + s * f.u[0] + t * f.v[0],
          f.n[1] + s * f.u[1] + t * f.v[1],
          f.n[2] + s * f.u[2] + t * f.v[2],
          cosY, sinY, cosX, sinX,
        );
        ctx.fillText(edge ? edgeCh : ch, cx + rx * size, cy + ry * size);
      }
    }
  }
}

const WIRE_CH = "+";
const WIRE_FONT_PX = 12;
const WIRE_ALPHA = 0.32;
// The object dialogue's wire flash reaches ANSWER_WIRE_ALPHA absolute —
// the wire renderers multiply their alpha param by WIRE_ALPHA, so the
// flash is passed through this gain to land at the absolute level.
const ANSWER_WIRE_GAIN = ANSWER_WIRE_ALPHA / WIRE_ALPHA;

/**
 * Blueprint wireframe of the torus (run-2 IDEA iter 9): 8 meridians +
 * 12 parallels plotted as sparse "+" marks with the same projection as
 * the solid torus. No z-buffer — the see-through construction read is
 * the point (the "reveal the mechanism" grammar from the Codrops
 * scroll-world research: sketch underneath, painted surface on top).
 */
function drawTorusWire(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  A: number,
  B: number,
  color: Rgb,
  alphaScale: number,
) {
  if (alphaScale <= 0.004) return;
  const sinA = Math.sin(A), cosA = Math.cos(A);
  const sinB = Math.sin(B), cosB = Math.cos(B);
  const R1 = 1, R2 = 0.44, K2 = 5;
  ctx.font = `${WIRE_FONT_PX}px ${OBJ_FONT}`;
  ctx.fillStyle = rgba(color, alphaScale);
  const plot = (i: number, j: number) => {
    const sinJ = Math.sin(j), cosJ = Math.cos(j);
    const sinI = Math.sin(i), cosI = Math.cos(i);
    const circX = R1 + R2 * cosJ;
    const circY = R2 * sinJ;
    const x = circX * (cosB * cosI + sinA * sinB * sinI) - circY * cosA * sinB;
    const y = circX * (sinB * cosI - sinA * cosB * sinI) + circY * cosA * cosB;
    const z = K2 + cosA * circX * sinI + circY * sinA;
    const ooz = 1 / z;
    ctx.fillText(WIRE_CH, cx + x * ooz * radius * 3.4, cy + y * ooz * radius * 3.4);
  };
  for (let m = 0; m < 8; m++) {
    const j = (m / 8) * Math.PI * 2;
    for (let i = 0; i < Math.PI * 2; i += 0.09) plot(i, j);
  }
  for (let n = 0; n < 12; n++) {
    const i = (n / 12) * Math.PI * 2;
    for (let j = 0; j < Math.PI * 2; j += 0.16) plot(i, j);
  }
}

/** Blueprint wireframe of the sphere: latitude/longitude grid, front hemisphere. */
function drawSphereWire(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rotY: number,
  tiltX: number,
  color: Rgb,
  alphaScale: number,
) {
  if (alphaScale <= 0.004) return;
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const cosX = Math.cos(tiltX), sinX = Math.sin(tiltX);
  ctx.font = `${WIRE_FONT_PX}px ${OBJ_FONT}`;
  ctx.fillStyle = rgba(color, alphaScale);
  const plot = (th: number, ph: number) => {
    const x0 = Math.sin(ph) * Math.cos(th);
    const y0 = Math.cos(ph);
    const z0 = Math.sin(ph) * Math.sin(th);
    const x1 = x0 * cosY + z0 * sinY;
    const z1 = z0 * cosY - x0 * sinY;
    const y2 = y0 * cosX - z1 * sinX;
    const z2 = y0 * sinX + z1 * cosX;
    if (z2 <= 0.02) return; // back hemisphere, like the solid
    ctx.fillText(WIRE_CH, cx + x1 * radius, cy + y2 * radius);
  };
  for (let l = 1; l <= 5; l++) {
    const ph = (l / 6) * Math.PI;
    for (let th = 0; th < Math.PI * 2; th += 0.12) plot(th, ph);
  }
  for (let m = 0; m < 8; m++) {
    const th = (m / 8) * Math.PI * 2;
    for (let ph = 0.15; ph < Math.PI - 0.1; ph += 0.12) plot(th, ph);
  }
}

const CUBE_WIRE_EDGES: Array<[[number, number, number], [number, number, number]]> =
  (() => {
    const v: Array<[number, number, number]> = [];
    for (const x of [-0.84, 0.84])
      for (const y of [-0.84, 0.84]) for (const z of [-0.84, 0.84]) v.push([x, y, z]);
    const edges: Array<[[number, number, number], [number, number, number]]> = [];
    for (let a = 0; a < 8; a++)
      for (let b = a + 1; b < 8; b++) {
        const diff =
          (v[a][0] !== v[b][0] ? 1 : 0) +
          (v[a][1] !== v[b][1] ? 1 : 0) +
          (v[a][2] !== v[b][2] ? 1 : 0);
        if (diff === 1) edges.push([v[a], v[b]]);
      }
    return edges;
  })();

/** Blueprint wireframe of the cube: its 12 edges as "+" runs. */
function drawCubeWire(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  rotY: number,
  rotX: number,
  color: Rgb,
  alphaScale: number,
) {
  if (alphaScale <= 0.004) return;
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  ctx.font = `${WIRE_FONT_PX}px ${OBJ_FONT}`;
  ctx.fillStyle = rgba(color, alphaScale);
  for (const [a, b] of CUBE_WIRE_EDGES) {
    for (let s = 0; s <= 8; s++) {
      const t = s / 8;
      const [rx, ry] = rot3(
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
        cosY, sinY, cosX, sinX,
      );
      ctx.fillText(WIRE_CH, cx + rx * size, cy + ry * size);
    }
  }
}

function makeGlyph(w: number, h: number, mobile: boolean): Glyph {
  const roll = Math.random();
  const layer = (roll < 0.45 ? 0 : roll < 0.8 ? 1 : 2) as 0 | 1 | 2;
  const speed = rand(2, 9) * (mobile ? 0.7 : 1);
  const dir = rand(0, Math.PI * 2);
  const [aMin, aMax] = LAYER_ALPHA[layer];
  return {
    ch: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
    x: Math.random() * w,
    y: Math.random() * h,
    vx: Math.cos(dir) * speed,
    vy: Math.sin(dir) * speed * 0.6,
    angle: rand(0, Math.PI * 2),
    spin: rand(0.02, 0.12) * (Math.random() < 0.5 ? -1 : 1),
    layer,
    accent: Math.random() < 0.25,
    alpha: rand(aMin, aMax),
  };
}

export function FloatingGlyphs() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Progressive scroll blur (v2): the glyph canvas is a background layer,
  // so it picks up blur with scroll depth (0px top → 5px bottom) while
  // page content stays crisp. Reduced motion disables the ramp.
  const blurRef = useScrollBlur<HTMLCanvasElement>(5);
  const setCanvas = (el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    blurRef.current = el;
  };
  // The 3D objects live on their OWN layer (run-2 iter 3): the glyph
  // field melts under the progressive CSS blur, but the objects pass
  // through a focal plane instead — crisp at their window center, softly
  // defocused at the window edges (per-object ctx.filter blur on the
  // composite). This canvas never takes the blurRef filter.
  const objectCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const setObjectCanvas = (el: HTMLCanvasElement | null) => {
    objectCanvasRef.current = el;
  };
  const colorsRef = useRef<{ fg: Rgb; accent: Rgb } | null>(null);
  const { resolvedTheme } = useTheme();
  const { palette } = usePalette();

  // Re-probe theme colors whenever the theme or palette changes.
  useEffect(() => {
    if (!resolvedTheme) return;
    const fg = probeTokenColor("--foreground") ?? { r: 238, g: 244, b: 250 };
    const accent = probeTokenColor("--accent-neon") ?? { r: 125, g: 211, b: 252 };
    colorsRef.current = { fg, accent };
  }, [resolvedTheme, palette]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !resolvedTheme) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // The 3D-object layer is optional chrome: if its context is
    // unavailable the glyph field still renders and objects are
    // skipped gracefully (the object block gates on octx).
    const ocanvas = objectCanvasRef.current;
    const octx = ocanvas ? ocanvas.getContext("2d") : null;
    // Per-draw ctx.filter blur is the depth-of-field compositing
    // mechanism. Detect on the prototype — assigning the property on an
    // unsupported context would silently create an expando and lie.
    const filterOK =
      !!octx &&
      typeof CanvasRenderingContext2D !== "undefined" &&
      "filter" in CanvasRenderingContext2D.prototype;
    if (octx) {
      try {
        octx.filter = "none";
      } catch {
        /* unsupported — objects render crisp, no crash */
      }
    }

    const root = document.documentElement;
    const reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    const mobile = window.matchMedia(MOBILE_QUERY).matches;
    // Claim the background immediately so EffectStage never flashes the
    // shader backdrop under the glyph field.
    root.dataset.journey = "active";
    let disposed = false;
    let raf = 0;
    // Snapshot-publisher hold (run-2 iter 20) — assigned in start()'s
    // animated path, released in the effect cleanup below.
    let snapRelease: (() => void) | undefined;
    let glyphs: Glyph[] = [];
    let w = 0;
    let h = 0;
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;
    // Wall-clock seconds accumulated across animated draws — drives the
    // 3D objects' idle spin (scroll depth drives the rest of their turn).
    let timeS = 0;
    // Scroll-velocity warp stretch (run-2 iter 2): smoothed |px/s| of the
    // page. During fast scrolls the glyph field streaks along the scroll
    // axis (a warp-field read); at rest vel decays to 0 and stretch is
    // exactly 0, so the still render is identical to the pre-warp field.
    // The velocity now comes from the shared snapshot publisher (run-2
    // iter 20) — the same low-pass, sampled once per frame for every
    // consumer. Reduced-motion never reaches here — draw(0) leaves the
    // snapshot unread.
    // Pointer light-wash (run-2 iter 6): a FROST light source follows
    // the pointer and illuminates the glyphs around it — the pointer's
    // half of the background's reactivity (scroll owns the other half).
    // lightAmt eases to 0 when the pointer leaves the window or the tab
    // hides, so the at-rest field is byte-identical to the pre-wash
    // render and the reduced-motion still is untouched.
    let lightAmt = 0;
    let pointerPresent = false;
    // Pointer inspection (run-2 IDEA iter 9): per-object smoothed
    // "the visitor is looking at this object" amounts. The pointer's
    // half of the background's reactivity, completing the scroll-owned
    // half — proximity pulls the object into focus (focus pull) and fades
    // in its wireframe construction drawing (blueprint overlay), the
    // sketch-underneath grammar from the scroll-world research. Eases to
    // exactly 0 when the pointer leaves, so a pointer that never arrives
    // leaves the render identical; animated ticks only (dt>0), so the
    // reduced-motion still is untouched.
    let insp = [0, 0, 0];
    // Object dialogue (run-2 IDEA iter 21, built iter 22): per-object
    // integrated spin phase from answered glances + the live wire-flash
    // envelope. The phase accumulates only while the one-shot spin
    // envelope is alive — after the cutoff the extra rate is exactly 0,
    // so the object rests at a new (stable) orientation; the wire flash
    // decays to exactly 0. Index order = OBJECT_WINDOWS (torus, sphere,
    // cube); the mobile torus reuses slot/index 0.
    const ansPhase = [0, 0, 0];
    const ansWire = [0, 0, 0];
    // Chapter-reactive vocabulary (run-2 IDEA iter 7): the active chapter
    // and the section tops come from the shared snapshot publisher
    // (run-2 iter 20) — the same 45%-line resolution the bust's glance
    // reads (the rail keeps its own deliberate 35% line over the same
    // published tops), so the ping fires on the exact same frame as the
    // glance. curChapter starts at -1 so the first tick lands on the
    // real chapter without presuming the visitor loaded at the top;
    // vocabBlend 0→1 over ~0.9s dissolves the field's characters toward
    // the new chapter's set.
    let curChapter = -1;
    /**
     * Chapter-crossing noise wipe (run-2 IDEA iter 12): the continuous,
     * scroll-timeline-driven counterpart to the one-shot ping — the
     * field's vocabulary tears from one chapter's dialect to the next as
     * the visitor scrolls between crossings, through an organic
     * hard-edged front (fbm noise + a downward sweep bias, Mora
     * Romero's era-change grammar). A pure function of scrollY over the
     * whole page — the wipe event occupies the middle of each
     * inter-crossing interval, the field holding each chapter's pure
     * dialect while settled — so there are no zone handoffs, no
     * discrete pops, and scrolling back reverses the tear exactly. At
     * rest anywhere it is a static, deliberate texture. The wipe owns
     * every glyph's character on animated ticks via deterministic picks
     * (stable per glyph/crossing/side — nothing boils); the
     * reduced-motion still (dt=0) keeps the base GLYPHS field.
     */
    let wipeThr = 0;
    let wipeOutVocab: ReadonlyArray<string> = GLYPHS;
    let wipeInVocab: ReadonlyArray<string> = GLYPHS;
    let wipeKey = 0;
    /**
     * Chapter-entry ping (run-2 IDEA iter 8): one-shot dither ring
     * expanding from the activation line when the chapter changes — the
     * boundary beat the gradual vocab dissolve lacks. Fires only on a
     * real crossing (never the initial resolve), at most one per
     * cooldown, and only on animated ticks — the reduced-motion still
     * never pings and rest is exactly calm (envelope decays to 0).
     */
    let pings: Array<{ t0: number }> = [];
    let lastPingT = -Infinity;
    // Per-tick ping geometry (assigned inside the animated dt>0 block;
    // the reduced-motion still leaves these at 0 with pings empty, so
    // the ping loop below is dead code there).
    let pingOX = 0;
    let pingOY = 0;
    let pingMaxR = 0;
    // Offscreen tiles for the 3D objects (depth-of-field compositing).
    // Allocated in resize(); empty when the object layer is unavailable.
    let objSlots: ObjSlot[] = [];
    // Device-pixel ratio captured at resize for the object tiles' tear
    // grid (the tile canvases are allocated in device px).
    let tileDpr = 1;
    const makeSlot = (halfExtent: number, dpr: number): ObjSlot | null => {
      const cv = document.createElement("canvas");
      const px = Math.max(2, Math.ceil(halfExtent * 2 * dpr));
      cv.width = px;
      cv.height = px;
      const c = cv.getContext("2d");
      if (!c) return null;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.textAlign = "center";
      c.textBaseline = "middle";
      return { cv, ctx: c, half: halfExtent, region: halfExtent * 2 };
    };

    // Ordered-dither dissolve tiles (run-2 iter 4, upgraded iter 24):
    // the classic Bayer-4x4 threshold matrix repeats every 4px, which
    // reads as visible cross-hatch gridding at mid-dissolve (Heckel).
    // Replaced with a baked 128x128 blue-noise threshold tile
    // (lib/blue-noise.ts — Mitchell best-candidate on a torus, so it
    // repeats seamlessly): sixteen device-pixel tiles, tile L passing
    // exactly the pixels whose threshold < L*16 (the baked histogram is
    // perfectly flat, so the sweep is uniform). Dissolves now read as
    // organic isotropic grain instead of a grid. Built lazily (DOM).
    let ditherTiles: HTMLCanvasElement[] | null = null;
    const getDitherTiles = () => {
      if (ditherTiles) return ditherTiles;
      ditherTiles = Array.from({ length: 16 }, (_, level) => {
        const cv = document.createElement("canvas");
        cv.width = 128;
        cv.height = 128;
        const c = cv.getContext("2d");
        if (c) {
          const img = c.createImageData(128, 128);
          const cut = level * 16;
          for (let i = 0; i < 128 * 128; i++) {
            if (BLUE_NOISE_128[i] < cut) {
              img.data[i * 4] = 255;
              img.data[i * 4 + 1] = 255;
              img.data[i * 4 + 2] = 255;
              img.data[i * 4 + 3] = 255;
            }
          }
          c.putImageData(img, 0, 0);
        }
        return cv;
      });
      return ditherTiles;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      tileDpr = dpr;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (octx && ocanvas) {
        ocanvas.width = Math.round(w * dpr);
        ocanvas.height = Math.round(h * dpr);
        octx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Tiles sized for each object's max dive-grow radius plus margin
        // (objects are drawn centered at slot.half). The mobile torus
        // (54px base) is the binding case on narrow viewports.
        const tMax = Math.max(Math.min(104, w * 0.082), 54) * 1.2;
        const sMax = 74 * 1.2;
        const cMax = 52 * 1.2;
        objSlots = [
          makeSlot(tMax * 1.45 + 8, dpr),
          makeSlot(sMax + 8, dpr),
          makeSlot(cMax * 2 + 8, dpr),
        ].filter((s): s is ObjSlot => s !== null);
      }
      const per = mobile ? 17000 : 11500;
      const count = Math.round(Math.min(130, Math.max(40, (w * h) / per)));
      glyphs = Array.from({ length: count }, () => makeGlyph(w, h, mobile));
    };

    const draw = (dt: number, now = 0) => {
      const colors = colorsRef.current;
      if (!colors) return;
      timeS += dt;
      ctx.clearRect(0, 0, w, h);
      // Warp stretch: scroll velocity from the shared snapshot
      // publisher (run-2 iter 20) — one low-passed sample per frame for
      // every consumer, so the field's warp and the marquee's boost read
      // the same velocity during flings.
      let stretch = 0;
      if (dt > 0) {
        stretch = velocityStretch(Math.abs(scrollSnapshot.velocity));
      }
      // Pointer parallax converges on wall-clock time, not per-draw call,
      // so the feel is identical whether this runs at 12 or 60 fps.
      const ease = 1 - Math.pow(0.96, dt * 60);
      pointerX += (targetX - pointerX) * ease;
      pointerY += (targetY - pointerY) * ease;
      // Pointer light-wash: the lit amount eases in while the pointer is
      // over the window and relaxes back to exactly 0 when it leaves, so
      // a pointer that never arrives leaves the frame identical. Only on
      // animated ticks — the reduced-motion still (dt=0) never washes.
      if (dt > 0) lightAmt += ((pointerPresent ? 1 : 0) - lightAmt) * ease;
      const wash = lightAmt > 0.001 ? lightAmt : 0;
      const lightLX = (pointerX * 0.5 + 0.5) * w;
      const lightLY = (pointerY * 0.5 + 0.5) * h;
      const washRadius = Math.min(Math.max(Math.min(w, h) * 0.3, 200), 380);
      const scrollShift = scrollSnapshot.y;
      // Chapter-reactive vocabulary (animated ticks only): the active
      // chapter and document-relative section tops come from the shared
      // snapshot publisher (run-2 iter 20) — no per-tick layout reads
      // here, and the bust's glance + the rail resolve the identical
      // value, so the ping fires on the same frame they do. The
      // chapter-crossing noise wipe (declared above) owns every glyph's
      // character on these ticks — a scroll-driven tear between dialects,
      // never a global pop. The reduced-motion still (dt=0) never runs
      // this and keeps the base GLYPHS field.
      if (dt > 0) {
        const sy = scrollSnapshot.y;
        // Document-relative section tops, published once per frame — the
        // viewport-relative tops (for the wipe interval) derive from
        // these, so the crossing math and the activation rule can never
        // disagree about where a chapter begins.
        const docTops = scrollSnapshot.tops;
        const next = scrollSnapshot.chapterIndex;
        // The wipe interval: k crossings sit at or above the scroll
        // position; the field tears from chapter k-1's dialect to chapter
        // k's across the interval between the surrounding crossings.
        {
          const nCh = docTops.length;
          let k = 0;
          const cys: number[] = [];
          for (let i = 1; i < nCh; i++) {
            const cy = Number.isFinite(docTops[i])
              ? chapterCrossingScrollY(docTops[i], h)
              : Number.POSITIVE_INFINITY;
            cys.push(cy);
            if (sy >= cy) k++;
          }
          const lo = k === 0 ? Number.NEGATIVE_INFINITY : cys[k - 1];
          const hi =
            k >= cys.length ? Number.POSITIVE_INFINITY : cys[k];
          const outI = k === 0 ? 0 : Math.min(k - 1, nCh - 1);
          const inI = Math.min(k, nCh - 1);
          wipeThr = wipeSweepThreshold(wipeRawFrac(sy, lo, hi));
          // Share the live threshold with the portrait bust so the head
          // tears through the same crossing (run-2 IDEA iter 14) — the
          // bust reads this in its own draw loop, no extra layout reads.
          scrollShared.wipeThr = wipeThr;
          wipeOutVocab = VOCAB[outI];
          wipeInVocab = VOCAB[inI];
          wipeKey = k;
          // Observability (same quantized pattern as data-ping-env):
          // the sweep threshold, so probes gate on the component's own
          // clock instead of wall-clock time.
          const q = String(Math.round(wipeThr * 20) / 20);
          if (canvas.dataset.wipeFrac !== q) canvas.dataset.wipeFrac = q;
        }
        if (next !== curChapter) {
          const initial = curChapter < 0;
          curChapter = next;
          // Chapter-entry ping: only a real crossing fires (never the
          // initial resolve), and only after the cooldown since the
          // previous ping — a fling through four chapters pings once.
          if (!initial && timeS - lastPingT >= PING_COOLDOWN_S) {
            pings.push({ t0: timeS });
            lastPingT = timeS;
            // Observability contract (same pattern as data-vocabChapter):
            // the chapter that last pinged is inspectable for
            // tests/debugging without reaching into the closure.
            canvas.dataset.chapterPing = String(next);
          }
          // Observability contract (same data-attribute pattern as
          // data-journey/data-ascii): the resolved chapter is inspectable
          // for tests and debugging without reaching into the closure.
          canvas.dataset.vocabChapter = String(next);
        }
        // Chapter-entry ping ring: drop expired pings, then per glyph
        // lift the alpha of glyphs near the expanding front — gated
        // through the Bayer-4x4 grammar so the ring reads as dithered
        // dots, never a glow ring.
        pings = pings.filter((pg) => timeS - pg.t0 < PING_DURATION_S);
        pingOX = w * 0.5;
        pingOY = h * 0.45;
        pingMaxR = Math.min(w, h) * PING_RADIUS_FRAC;
        // Observability: the live envelope, quantized — lets probes and
        // screenshots gate on the component's own clock (headless rAF can
        // run far slower than wall-clock). Written only while a ping is
        // alive, and only when the quantized value changes.
        if (pings.length > 0) {
          const q = String(
            Math.round(pingEnvelope(timeS - pings[0].t0, PING_DURATION_S) * 20) / 20,
          );
          if (canvas.dataset.pingEnv !== q) canvas.dataset.pingEnv = q;
        } else if (canvas.dataset.pingEnv !== undefined) {
          delete canvas.dataset.pingEnv;
        }
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let gi = 0; gi < glyphs.length; gi++) {
        const g = glyphs[gi];
        if (dt > 0) {
          g.x += g.vx * dt;
          g.y += g.vy * dt;
          g.angle += g.spin * dt;
          if (g.x < -30) g.x = w + 30;
          if (g.x > w + 30) g.x = -30;
          if (g.y < -30) g.y = h + 30;
          if (g.y > h + 30) g.y = -30;
        }
        const depth = g.layer + 1;
        const px = g.x + pointerX * LAYER_PARALLAX[g.layer];
        // Scroll dive: per-layer travel so near glyphs rush past.
        const rawY =
          g.y +
          pointerY * LAYER_PARALLAX[g.layer] -
          scrollShift * LAYER_SCROLL[g.layer];
        const py = ((rawY % (h + 60)) + h + 60) % (h + 60) - 30;
        // Chapter-crossing noise wipe: every glyph's character comes from
        // the outgoing or incoming vocabulary by the wipe field — fbm
        // noise plus a downward sweep bias, hard-edged (Mora Romero's
        // era-change grammar). The pick is deterministic per
        // (glyph, interval, side), so the front moves without any
        // character boiling as it passes, and jumps self-heal on the
        // next tick. Animated ticks only — the reduced-motion still is
        // untouched.
        if (dt > 0) {
          const nz =
            WIPE_FBM_WEIGHT * fbm2(px / WIPE_NOISE_PX, py / WIPE_NOISE_PX) +
            WIPE_SWEEP_BIAS * (py / Math.max(h, 1));
          const incoming = nz < wipeThr;
          g.ch = wipeGlyphChar(
            incoming ? wipeInVocab : wipeOutVocab,
            gi,
            wipeKey,
            incoming,
          );
        }
        // Pointer light-wash: glyphs near the smoothed pointer position
        // brighten and grow slightly — computed on the final screen
        // position (parallax + scroll dive included). wash=0 (pointer
        // absent, or reduced-motion dt=0) leaves the glyph identical.
        let washScale = 1;
        let washBoost = 0;
        if (wash > 0) {
          const dx = px - lightLX;
          const dy = py - lightLY;
          const fall = lightWashFalloff(
            Math.sqrt(dx * dx + dy * dy),
            washRadius,
          );
          if (fall > 0.001) {
            washScale = 1 + 0.22 * fall * wash;
            washBoost = Math.max(
              0,
              Math.min(0.3 * fall * wash, 0.85 - g.alpha),
            );
          }
        }
        // Chapter-entry ping (run-2 IDEA iter 8): glyphs near the
        // expanding ring front lift through the dither grammar — a
        // Bayer-4x4 gate at the envelope level, so the front is dots,
        // not glow. pings is empty (and this loop dead) at rest.
        let pingBoost = 0;
        for (const pg of pings) {
          const e = timeS - pg.t0;
          const env = pingEnvelope(e, PING_DURATION_S);
          if (env <= 0) continue;
          const r = pingRadius01(e, PING_DURATION_S) * pingMaxR;
          const ddx = px - pingOX;
          const ddy = py - pingOY;
          const band = Math.abs(Math.sqrt(ddx * ddx + ddy * ddy) - r);
          if (band < PING_BAND_PX) {
            // Blue-noise gate (run-2 iter 24): the 4x4 Bayer gate stamped
            // a visible cross-hatch on the wavefront; the 128px tile keeps
            // the same pass fraction (env of the 0..255 range).
            if (
              blueNoiseThreshold(Math.round(px), Math.round(py)) <
              env * 255
            ) {
              pingBoost += env * (1 - band / PING_BAND_PX) * PING_BOOST_MAX;
            }
          }
        }
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(g.angle);
        if (stretch > 0.001) {
          // Warp stretch: elongate along the scroll axis with a slight
          // horizontal squeeze — the slit-scan / motion-smear read.
          ctx.scale(1 - 0.15 * stretch, 1 + 2.2 * stretch);
        }
        if (washScale !== 1) ctx.scale(washScale, washScale);
        ctx.font = `${LAYER_SIZE[g.layer]}px "JetBrains Mono", ui-monospace, monospace`;
        // Boosts share one alpha ceiling: the glyph never exceeds 0.85,
        // so a ping and the pointer wash composing stays whisper-level.
        const baseAlpha = g.alpha * (stretch > 0.001 ? 1 - 0.3 * stretch : 1);
        const boost = Math.min(
          washBoost + pingBoost,
          Math.max(0, 0.85 - baseAlpha),
        );
        ctx.fillStyle = rgba(
          g.accent ? colors.accent : colors.fg,
          baseAlpha + boost,
        );
        ctx.fillText(g.ch, 0, 0);
        ctx.restore();
      }

      // Chapter-entry ping ring (run-2 IDEA iter 8): the field's ~130
      // glyphs are too sparse for a glyph-only wavefront to read — most
      // crossings would brighten zero glyphs — so the beat carries its
      // own dots: a Bayer-dithered ring stamped on the field in FROST
      // accent, expanding from the activation line. The per-dot gate
      // threshold scales with the band-edge falloff, so the ring melts
      // at its rims with zero extra fillStyle changes; the envelope
      // decays to exactly 0, keeping rest calm. Animated ticks only —
      // the reduced-motion still never pings.
      if (dt > 0 && pings.length > 0) {
        for (const pg of pings) {
          const e = timeS - pg.t0;
          const env = pingEnvelope(e, PING_DURATION_S);
          if (env <= 0.01) continue;
          const r = pingRadius01(e, PING_DURATION_S) * pingMaxR;
          if (r < 2) continue;
          const pitch = 5;
          ctx.fillStyle = rgba(colors.accent, env * 0.35);
          const steps = Math.max(24, Math.floor((2 * Math.PI * r) / pitch));
          for (let s = 0; s < steps; s++) {
            const a = (s / steps) * Math.PI * 2;
            const ca = Math.cos(a);
            const sa = Math.sin(a);
            for (let rr = r - PING_BAND_PX; rr <= r + PING_BAND_PX; rr += pitch) {
              if (rr <= 0) continue;
              const x = pingOX + rr * ca;
              const y = pingOY + rr * sa;
              if (x < 0 || y < 0 || x >= w || y >= h) continue;
              const edge = 1 - Math.abs(rr - r) / PING_BAND_PX;
              // Blue-noise dot gate (run-2 iter 24): same pass fraction as
              // the old Bayer gate (env*edge of the dots), now isotropic
              // grain instead of a 4px cross-hatch.
              if (
                blueNoiseThreshold(Math.round(x), Math.round(y)) >=
                env * 255 * edge
              )
                continue;
              ctx.fillRect(x, y, 2, 2);
            }
          }
        }
      }

      // Scroll-reactive 3D ASCII objects (v2) — animated frames only, so
      // the reduced-motion still frame stays the plain glyph field.
      //
      // Depth-of-field compositing (run-2 iter 3): each object renders
      // into its offscreen tile, then blits onto the object layer with a
      // per-object defocus blur — 0px at its window center (the focal
      // plane), up to 3px toward the window edges — so entrances and
      // exits read as directed transitions instead of hard alpha pops.
      // The object layer never takes the field's progressive CSS blur:
      // v85 proved the shared 2.5-5px melt turned the sphere/cube into
      // gray smudges at 50/100% depth, and the bright-rim mitigation
      // (a3122f7) could not survive it — splitting the layer fixes the
      // cause, not the symptom. The fling warp stretch applies to the
      // blit (vertical smear + slight squeeze + alpha dip), matching the
      // per-glyph treatment.
      //
      // Dither dissolve (run-2 iter 4): the window envelope no longer
      // fades alpha — it sweeps a Bayer-4x4 threshold pattern applied
      // `destination-in` on the tile, so objects dissolve in and out
      // through ordered dither (crisp dots, the brand's texture grammar)
      // instead of a uniform ghost fade. Applied in device space so each
      // pattern cell is one device pixel; skipped at level 15, where the
      // settled window renders identically to the pre-dissolve object.
      if (dt > 0 && octx && objSlots.length === 3) {
        const p = scrollSnapshot.progress;
        const accent = colors.accent;
        const sAlpha = stretch > 0.001 ? 1 - 0.3 * stretch : 1;
        const sX = stretch > 0.001 ? 1 - 0.15 * stretch : 1;
        const sY = stretch > 0.001 ? 1 + 2.2 * stretch : 1;
        octx.clearRect(0, 0, w, h);
        // Object dialogue (run-2 IDEA iter 21, built iter 22): the bust
        // publishes { obj, t0 } into scrollShared when an OBJECT glance
        // fires — the answering tile spins up (integrated into its
        // rotation phase) and flashes its wireframe. Chapter glances
        // publish nothing, so the flash stays exactly 0 for them. The
        // field owns expiry: once both envelopes read 0 the signal is
        // nulled, so a stale answer can never stick.
        let ansObj = -1;
        let ansSpin = 0;
        if (scrollShared.objectAnswer) {
          const ans = scrollShared.objectAnswer;
          if (ans.obj < 0 || ans.obj >= 3) {
            scrollShared.objectAnswer = null; // degenerate — the bust only writes 0..2
          } else {
            const dtS = (now - ans.t0) / 1000;
            ansSpin = answerSpinEnvelope(dtS);
            const wire = answerWireEnvelope(dtS);
            if (ansSpin <= 0 && wire <= 0) {
              scrollShared.objectAnswer = null;
            } else {
              ansObj = ans.obj;
              ansPhase[ansObj] += ansSpin * ANSWER_SPIN_RATE * dt;
              ansWire[ansObj] = wire;
            }
          }
        }
        for (let i = 0; i < 3; i++) {
          if (i !== ansObj) ansWire[i] = 0;
        }
        // Observability for probes (mirrors data-ping-env on the field
        // canvas): the peak live answer envelope, quantized — "0.00" at
        // rest. `now` shares the rAF origin with the bust's t0, so probes
        // gate on the component's own clock, not wall-clock.
        if (ocanvas) {
          const q =
            ansObj >= 0 ? Math.max(ansSpin, ansWire[ansObj]).toFixed(2) : "0.00";
          if (ocanvas.dataset.objectAnswer !== q)
            ocanvas.dataset.objectAnswer = q;
        }
        // Render one object into its tile, then blit it to (cx, cy) with
        // its focus blur. `envelope` is the window alpha (0..1);
        // `inspIdx` selects the object's smoothed inspection amount and
        // `inspectR` its pointer-engage radius (CSS px). Proximity drives
        // two things, both relaxing to exactly the pre-inspection render
        // when the pointer is away: (1) the wireframe construction
        // drawing fades in over the solid (whisper blueprint, drawn into
        // the tile before the dither mask so it dissolves with the
        // object), (2) the scroll-DOF envelope is pulled toward full
        // focus, and the blit grows slightly — the object comes forward
        // to be inspected.
        const place = (
          slot: ObjSlot,
          envelope: number,
          cx: number,
          cy: number,
          inspIdx: number,
          inspectR: number,
          render: (c: CanvasRenderingContext2D, alpha: number) => void,
          renderWire: (c: CanvasRenderingContext2D, alpha: number) => void,
        ) => {
          const dist = Math.hypot(cx - lightLX, cy - lightLY);
          const target = pointerPresent ? lightWashFalloff(dist, inspectR) : 0;
          insp[inspIdx] += (target - insp[inspIdx]) * ease;
          const iv = insp[inspIdx] > 0.001 ? insp[inspIdx] : 0;
          const sctx = slot.ctx;
          sctx.clearRect(0, 0, slot.region, slot.region);
          // The envelope drives the dither sweep below, not alpha —
          // `sAlpha` (the fling warp dip) still dims the render.
          render(sctx, sAlpha);
          // Object dialogue: the answering tile's wireframe flashes at up
          // to ANSWER_WIRE_ALPHA absolute (via ANSWER_WIRE_GAIN), drawn
          // into the tile before the dither mask so it dissolves with
          // the object — the same layering as the inspection blueprint.
          // inspIdx doubles as the object index (0/1/2 = torus/sphere/
          // cube, mobile torus reuses 0).
          renderWire(sctx, (iv + ansWire[inspIdx] * ANSWER_WIRE_GAIN) * sAlpha);
          const level = ditherDissolveLevel(envelope);
          if (level < 15) {
            const tile = getDitherTiles()[level];
            const pat = sctx.createPattern(tile, "repeat");
            if (pat) {
              sctx.save();
              sctx.setTransform(1, 0, 0, 1, 0, 0);
              sctx.globalCompositeOperation = "destination-in";
              sctx.fillStyle = pat;
              sctx.fillRect(0, 0, slot.cv.width, slot.cv.height);
              sctx.restore();
            }
          }
          // Chapter-boundary dither tear (run-2 IDEA iter 17, built
          // iter 18 — "the wipe tears the objects too"): the last scroll
          // layer joins the chapter grammar — the same triangular wipe
          // gate and fbm hard edge as the bust tear (iter 14), applied to
          // the object's tile as a destination-out punch at 4-device-px
          // cells (matches the brand's dither-dot scale). Skipped entirely
          // at wipeThr 0/1, so the settled render is byte-identical to the
          // pre-tear object; deliberate dither tear mid-crossing, noise
          // anchored to the tile so it never boils. Reduced-motion
          // untouched: this whole block only runs on animated ticks.
          const wipeThr = scrollShared.wipeThr;
          if (wipeThr > 0 && wipeThr < 1) {
            const cell = 4;
            const tw = slot.cv.width;
            const th = slot.cv.height;
            sctx.save();
            sctx.setTransform(1, 0, 0, 1, 0, 0);
            sctx.globalCompositeOperation = "destination-out";
            sctx.fillStyle = "#000";
            for (let ty = 0; ty < th; ty += cell) {
              for (let tx = 0; tx < tw; tx += cell) {
                // bustWipeDrop is the unit-tested pure contract:
                // triangular depth on wipeThr, 0.55 cap keeps the object
                // readable at the tear's peak (deliberate dither, not a
                // glitch). Noise feature size matches the field's wipe.
                if (
                  bustWipeDrop(
                    fbm2(
                      tx / tileDpr / WIPE_NOISE_PX,
                      ty / tileDpr / WIPE_NOISE_PX,
                    ),
                    wipeThr,
                  )
                ) {
                  sctx.fillRect(tx, ty, cell, cell);
                }
              }
            }
            sctx.restore();
          }
          const focus = filterOK ? objectDefocus(inspectFocusEnvelope(envelope, iv)) : 0;
          const grow = 1 + 0.06 * iv;
          octx.save();
          if (focus > 0.05) octx.filter = `blur(${focus.toFixed(2)}px)`;
          const dw = slot.region * sX * grow;
          const dh = slot.region * sY * grow;
          octx.drawImage(slot.cv, cx - dw / 2, cy - dh / 2, dw, dh);
          octx.restore();
        };
        if (mobile) {
          const a = windowAlpha(p, 0.02, 0.55);
          if (a > 0.01) {
            const slot = objSlots[0];
            const pose = divePose(TORUS_DIVE_MOBILE, windowT(p, 0.02, 0.55), w, h);
            const r = 54 * pose.s;
            const A = timeS * 0.11 + p * 5 + ansPhase[0];
            const B = timeS * 0.07 + p * 3;
            place(slot, a, pose.cx, pose.cy, 0, r * 1.5,
              (c, alpha) =>
                drawTorus(c, slot.half, slot.half, r, A, B, accent, 0.4 * alpha),
              (c, alpha) =>
                drawTorusWire(c, slot.half, slot.half, r, A, B, accent, WIRE_ALPHA * alpha),
            );
          }
        } else {
          const tA = windowAlpha(p, OBJECT_WINDOWS[0].a, OBJECT_WINDOWS[0].b);
          if (tA > 0.01) {
            const slot = objSlots[0];
            const pose = divePose(TORUS_DIVE, windowT(p, OBJECT_WINDOWS[0].a, OBJECT_WINDOWS[0].b), w, h);
            const r = Math.min(104, w * 0.082) * pose.s;
            const A = timeS * 0.11 + p * 5 + ansPhase[0];
            const B = timeS * 0.07 + p * 3;
            place(slot, tA, pose.cx, pose.cy, 0, r * 1.5,
              (c, alpha) =>
                drawTorus(c, slot.half, slot.half, r, A, B, accent, 0.42 * alpha),
              (c, alpha) =>
                drawTorusWire(c, slot.half, slot.half, r, A, B, accent, WIRE_ALPHA * alpha),
            );
          }
          const sA = windowAlpha(p, OBJECT_WINDOWS[1].a, OBJECT_WINDOWS[1].b);
          if (sA > 0.01) {
            const slot = objSlots[1];
            const sWt = windowT(p, OBJECT_WINDOWS[1].a, OBJECT_WINDOWS[1].b);
            const pose = divePose(SPHERE_DIVE, sWt, w, h);
            const r = 74 * pose.s;
            const rotY = timeS * 0.15 + p * 7 + ansPhase[1];
            // Polar precession (run-2 IDEA iter 25): the sphere's axis tips
            // as a pure function of its own window progress — 0 at the
            // dissolve edges, peak mid-window, exactly reversible.
            const tiltX = 0.5 + objectPrecession(sWt);
            // Observability for probes (mirrors data-object-answer): the
            // live polar tilt, quantized — absent when the sphere isn't
            // drawn, so a present value always reflects this tick.
            if (ocanvas) {
              const tq = tiltX.toFixed(3);
              if (ocanvas.dataset.sphereTilt !== tq)
                ocanvas.dataset.sphereTilt = tq;
            }
            place(slot, sA, pose.cx, pose.cy, 1, r * 1.6,
              (c, alpha) =>
                drawSphere(c, slot.half, slot.half, r, rotY, tiltX, accent, 0.46 * alpha),
              (c, alpha) =>
                drawSphereWire(c, slot.half, slot.half, r, rotY, tiltX, accent, WIRE_ALPHA * alpha),
            );
          } else if (ocanvas && "sphereTilt" in ocanvas.dataset) {
            delete ocanvas.dataset.sphereTilt;
          }
          const cA = windowAlpha(p, OBJECT_WINDOWS[2].a, OBJECT_WINDOWS[2].b);
          if (cA > 0.01) {
            const slot = objSlots[2];
            const pose = divePose(CUBE_DIVE, windowT(p, OBJECT_WINDOWS[2].a, OBJECT_WINDOWS[2].b), w, h);
            const s = 52 * pose.s;
            const rotY = timeS * 0.2 + p * 6 + ansPhase[2];
            const rotX = 0.6 + timeS * 0.13 + p * 2;
            place(slot, cA, pose.cx, pose.cy, 2, s * 1.8,
              (c, alpha) =>
                drawCube(c, slot.half, slot.half, s, rotY, rotX, accent, 0.46 * alpha),
              (c, alpha) =>
                drawCubeWire(c, slot.half, slot.half, s, rotY, rotX, accent, WIRE_ALPHA * alpha),
            );
          }
        }
      }
    };

    // Cadence throttle (iter-53, raised in v2): the glyph field moves
    // 2-9 px/s with <=0.12 rad/s spin — imperceptible frame-to-frame, so
    // full-rate redraws are pure GPU/battery burn on a page that sits
    // open (the iter-28 BERAT needsFrames() precedent; Magic UI Glyph
    // Matrix's 90ms tick is the same precedent). v2's 3D objects rotate
    // visibly with scroll, so the tick rose from ~83ms to ~33ms — still
    // half of full frame rate. rAF drives the cadence (no wake plumbing
    // needed); physics advance on the accumulated dt, so visible motion
    // is identical at any tick; pointer/scroll parallax keep updating on
    // the tick. The reduced-motion single-frame path (dt=0) is untouched.
    const TICK_S = 1 / 30;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      if (disposed) return;
      const frameDt = Math.min((now - last) / 1000, 0.05);
      last = now;
      acc += frameDt;
      if (acc >= TICK_S) {
        draw(acc, now);
        acc = 0;
      }
      raf = requestAnimationFrame(loop);
    };

    const onPointer = (e: PointerEvent) => {
      pointerPresent = true;
      targetX = (e.clientX / Math.max(w, 1) - 0.5) * 2;
      targetY = (e.clientY / Math.max(h, 1) - 0.5) * 2;
    };
    // When the pointer is no longer over the page the light-wash relaxes
    // back to exactly 0 (same "no pointer, no wash" contract as the gaze
    // relaxation in the portrait bust).
    const onPointerGone = () => {
      pointerPresent = false;
    };
    const onVisibility = () => {
      if (document.hidden) pointerPresent = false;
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        if (reduced) draw(0);
      }, 150);
    };

    const start = async () => {
      try {
        await document.fonts.ready;
      } catch {
        /* glyphs are decorative; fallback font is fine */
      }
      if (disposed) return;
      resize();
      if (reduced) {
        draw(0); // one deliberate still frame; bust stays absent by design
        return;
      }
      // Animated path only: hold the shared scroll snapshot publisher
      // (run-2 iter 20) — one scroll sample per frame for the field, the
      // bust, the rail and the marquee. Released on unmount.
      snapRelease = subscribeScrollSnapshot();
      root.setAttribute("data-ascii", "active");
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("pointerleave", onPointerGone);
      window.addEventListener("blur", onPointerGone);
      document.addEventListener("visibilitychange", onVisibility);
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    void start();
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      snapRelease?.();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onPointerGone);
      window.removeEventListener("blur", onPointerGone);
      document.removeEventListener("visibilitychange", onVisibility);
      if (root.getAttribute("data-ascii") === "active") {
        root.removeAttribute("data-ascii");
      }
      if (root.dataset.journey === "active") {
        delete root.dataset.journey;
      }
    };
  }, [resolvedTheme]);

  return (
    <>
      <canvas ref={setCanvas} aria-hidden="true" className="floating-glyphs" />
      <canvas
        ref={setObjectCanvas}
        aria-hidden="true"
        className="floating-glyphs-objects"
      />
      <div aria-hidden="true" className="floating-glyphs-vignette" />
    </>
  );
}
