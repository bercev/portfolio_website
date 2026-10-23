"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import { usePalette } from "@/components/providers/palette-provider";
import { MOBILE_QUERY, REDUCED_MOTION_QUERY } from "@/lib/effect-policy";
import { ditherDissolveLevel, getScrollProgress, lightWashFalloff, objectDefocus, resolveChapterIndex, useScrollBlur, velocityStretch, CHAPTER_IDS } from "@/lib/scroll-fx";

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
 * identity while rest stays calm. Colors are probed from the live theme tokens
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
  for (const [key, cell] of cells) {
    const col = key % cols;
    const row = Math.floor(key / cols);
    const lum01 = Math.min(1, cell.lum / 1.15);
    const ch =
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
    // bright rim keeps the cube's geometry legible.
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
    // Reduced-motion never reaches here — draw(0) leaves vel at 0.
    let vel = 0;
    let lastScrollY = 0;
    // Pointer light-wash (run-2 iter 6): a FROST light source follows
    // the pointer and illuminates the glyphs around it — the pointer's
    // half of the background's reactivity (scroll owns the other half).
    // lightAmt eases to 0 when the pointer leaves the window or the tab
    // hides, so the at-rest field is byte-identical to the pre-wash
    // render and the reduced-motion still is untouched.
    let lightAmt = 0;
    let pointerPresent = false;
    // Chapter-reactive vocabulary (run-2 IDEA iter 7): section elements
    // are resolved per animated tick via getBoundingClientRect (robust to
    // transformed ancestors — the same rule the line-sidebar rail uses).
    // curChapter starts at -1 so the first tick lands on the real chapter
    // without presuming the visitor loaded at the top; vocabBlend 0→1
    // over ~0.9s dissolves the field's characters toward the new
    // chapter's set.
    const chapterEls = CHAPTER_IDS.map((id) => document.getElementById(id));
    let curChapter = -1;
    let prevChapter = 0;
    let vocabBlend = 1;
    // Offscreen tiles for the 3D objects (depth-of-field compositing).
    // Allocated in resize(); empty when the object layer is unavailable.
    let objSlots: ObjSlot[] = [];
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

    // Ordered-dither dissolve tiles (run-2 iter 4): the classic Bayer-4x4
    // threshold matrix as sixteen 4x4 device-pixel tiles — tile L passes
    // exactly the pixels whose threshold < L, so sweeping L 0..15 with an
    // object's window envelope dissolves it through the brand's dither
    // grammar instead of a plain alpha crossfade. Built lazily (DOM).
    const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    let ditherTiles: HTMLCanvasElement[] | null = null;
    const getDitherTiles = () => {
      if (ditherTiles) return ditherTiles;
      ditherTiles = Array.from({ length: 16 }, (_, level) => {
        const cv = document.createElement("canvas");
        cv.width = 4;
        cv.height = 4;
        const c = cv.getContext("2d");
        if (c) {
          c.fillStyle = "#fff";
          for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
              if (BAYER4[y * 4 + x] < level) c.fillRect(x, y, 1, 1);
            }
          }
        }
        return cv;
      });
      return ditherTiles;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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

    const draw = (dt: number) => {
      const colors = colorsRef.current;
      if (!colors) return;
      timeS += dt;
      ctx.clearRect(0, 0, w, h);
      // Warp stretch: sample scroll velocity on animated ticks only,
      // smoothed with a fast-attack single-pole low-pass so flings
      // bloom the field and slow reading scrolls stay calm.
      let stretch = 0;
      if (dt > 0) {
        const sy = window.scrollY;
        const raw = Math.abs(sy - lastScrollY) / Math.max(dt, 1e-3);
        lastScrollY = sy;
        vel += (raw - vel) * (1 - Math.pow(0.88, dt * 60));
        stretch = velocityStretch(vel);
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
      const scrollShift = window.scrollY;
      // Chapter-reactive vocabulary (animated ticks only): resolve the
      // active chapter from the sections' viewport-relative tops against
      // a 45% activation line (the rail's rule), then dissolve the field's
      // characters toward the new chapter's vocabulary — a per-glyph
      // stochastic re-roll, never a global pop, so chapter crossings read
      // as the field changing dialect. The blend lands exactly on the new
      // vocabulary, keeping rest calm; the reduced-motion still (dt=0)
      // never runs this and keeps the base GLYPHS field.
      if (dt > 0) {
        const next = resolveChapterIndex(
          chapterEls.map((el) =>
            el ? el.getBoundingClientRect().top : Number.POSITIVE_INFINITY,
          ),
          h * 0.45,
        );
        if (next !== curChapter) {
          prevChapter = curChapter < 0 ? next : curChapter;
          curChapter = next;
          vocabBlend = 0;
          // Observability contract (same data-attribute pattern as
          // data-journey/data-ascii): the resolved chapter is inspectable
          // for tests and debugging without reaching into the closure.
          canvas.dataset.vocabChapter = String(next);
        }
        if (vocabBlend < 1) {
          vocabBlend = Math.min(1, vocabBlend + dt / 0.9);
          const prevVocab = VOCAB[prevChapter];
          const nextVocab = VOCAB[curChapter];
          for (const g of glyphs) {
            // Mean re-roll in ~5 ticks at the 30fps cadence — the whole
            // field's dialect turns over well inside the 0.9s blend.
            if (Math.random() < dt * 6) {
              const v =
                Math.random() < vocabBlend ? nextVocab : prevVocab;
              g.ch = v[(Math.random() * v.length) | 0];
            }
          }
        }
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const g of glyphs) {
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
        ctx.fillStyle = rgba(
          g.accent ? colors.accent : colors.fg,
          g.alpha * (stretch > 0.001 ? 1 - 0.3 * stretch : 1) + washBoost,
        );
        ctx.fillText(g.ch, 0, 0);
        ctx.restore();
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
        const p = getScrollProgress();
        const accent = colors.accent;
        const sAlpha = stretch > 0.001 ? 1 - 0.3 * stretch : 1;
        const sX = stretch > 0.001 ? 1 - 0.15 * stretch : 1;
        const sY = stretch > 0.001 ? 1 + 2.2 * stretch : 1;
        octx.clearRect(0, 0, w, h);
        // Render one object into its tile, then blit it to (cx, cy) with
        // its focus blur. `envelope` is the window alpha (0..1).
        const place = (
          slot: ObjSlot,
          envelope: number,
          cx: number,
          cy: number,
          render: (c: CanvasRenderingContext2D, alpha: number) => void,
        ) => {
          const sctx = slot.ctx;
          sctx.clearRect(0, 0, slot.region, slot.region);
          // The envelope drives the dither sweep below, not alpha —
          // `sAlpha` (the fling warp dip) still dims the render.
          render(sctx, sAlpha);
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
          const focus = filterOK ? objectDefocus(envelope) : 0;
          octx.save();
          if (focus > 0.05) octx.filter = `blur(${focus.toFixed(2)}px)`;
          const dw = slot.region * sX;
          const dh = slot.region * sY;
          octx.drawImage(slot.cv, cx - dw / 2, cy - dh / 2, dw, dh);
          octx.restore();
        };
        if (mobile) {
          const a = windowAlpha(p, 0.02, 0.55);
          if (a > 0.01) {
            const slot = objSlots[0];
            const pose = divePose(TORUS_DIVE_MOBILE, windowT(p, 0.02, 0.55), w, h);
            const r = 54 * pose.s;
            const A = timeS * 0.11 + p * 5;
            const B = timeS * 0.07 + p * 3;
            place(slot, a, pose.cx, pose.cy, (c, alpha) =>
              drawTorus(c, slot.half, slot.half, r, A, B, accent, 0.4 * alpha),
            );
          }
        } else {
          const tA = windowAlpha(p, 0.02, 0.48);
          if (tA > 0.01) {
            const slot = objSlots[0];
            const pose = divePose(TORUS_DIVE, windowT(p, 0.02, 0.48), w, h);
            const r = Math.min(104, w * 0.082) * pose.s;
            const A = timeS * 0.11 + p * 5;
            const B = timeS * 0.07 + p * 3;
            place(slot, tA, pose.cx, pose.cy, (c, alpha) =>
              drawTorus(c, slot.half, slot.half, r, A, B, accent, 0.42 * alpha),
            );
          }
          const sA = windowAlpha(p, 0.38, 0.78);
          if (sA > 0.01) {
            const slot = objSlots[1];
            const pose = divePose(SPHERE_DIVE, windowT(p, 0.38, 0.78), w, h);
            const r = 74 * pose.s;
            const rotY = timeS * 0.15 + p * 7;
            place(slot, sA, pose.cx, pose.cy, (c, alpha) =>
              drawSphere(c, slot.half, slot.half, r, rotY, 0.5, accent, 0.46 * alpha),
            );
          }
          const cA = windowAlpha(p, 0.66, 1.05);
          if (cA > 0.01) {
            const slot = objSlots[2];
            const pose = divePose(CUBE_DIVE, windowT(p, 0.66, 1.05), w, h);
            const s = 52 * pose.s;
            const rotY = timeS * 0.2 + p * 6;
            const rotX = 0.6 + timeS * 0.13 + p * 2;
            place(slot, cA, pose.cx, pose.cy, (c, alpha) =>
              drawCube(c, slot.half, slot.half, s, rotY, rotX, accent, 0.46 * alpha),
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
        draw(acc);
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
      lastScrollY = window.scrollY;
      if (reduced) {
        draw(0); // one deliberate still frame; bust stays absent by design
        return;
      }
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
