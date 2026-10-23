"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import { usePalette } from "@/components/providers/palette-provider";
import { MOBILE_QUERY, REDUCED_MOTION_QUERY } from "@/lib/effect-policy";
import { getScrollProgress, useScrollBlur } from "@/lib/scroll-fx";

/**
 * FloatingGlyphs — the site background since the 2026-10-22 simplification
 * (user direction: drop the complex 3D journey scene; "just floating ascii
 * or glyph effects... make them rotating and stuff").
 *
 * A single calm Canvas2D layer: ASCII + geometric glyphs in three depth
 * layers drift slowly, each spinning on its own axis, with a whisper of
 * pointer/scroll parallax. Colors are probed from the live theme tokens
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
/* scroll-progress window — fading in, rotating with scroll depth    */
/* plus a slow idle spin, fading out — anchored at the viewport's    */
/* quiet corners so it never parks behind dense text:                */
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
  const fontSize = Math.max(8, radius * 0.17);
  const N = Math.round(radius * radius * 0.26);
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
    ctx.fillStyle = rgba(color, alphaScale * (0.25 + 0.75 * lum01));
    for (let a = 0; a <= STEPS; a++) {
      for (let b = 0; b <= STEPS; b++) {
        const s = -0.84 + (a / STEPS) * 1.68;
        const t = -0.84 + (b / STEPS) * 1.68;
        const [rx, ry] = rot3(
          f.n[0] + s * f.u[0] + t * f.v[0],
          f.n[1] + s * f.u[1] + t * f.v[1],
          f.n[2] + s * f.u[2] + t * f.v[2],
          cosY, sinY, cosX, sinX,
        );
        ctx.fillText(ch, cx + rx * size, cy + ry * size);
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

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const per = mobile ? 17000 : 11500;
      const count = Math.round(Math.min(130, Math.max(40, (w * h) / per)));
      glyphs = Array.from({ length: count }, () => makeGlyph(w, h, mobile));
    };

    const draw = (dt: number) => {
      const colors = colorsRef.current;
      if (!colors) return;
      timeS += dt;
      ctx.clearRect(0, 0, w, h);
      // Pointer parallax converges on wall-clock time, not per-draw call,
      // so the feel is identical whether this runs at 12 or 60 fps.
      const ease = 1 - Math.pow(0.96, dt * 60);
      pointerX += (targetX - pointerX) * ease;
      pointerY += (targetY - pointerY) * ease;
      const scrollShift = window.scrollY;
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
        const rawY = g.y + pointerY * LAYER_PARALLAX[g.layer] - scrollShift * 0.03 * depth;
        const py = ((rawY % (h + 60)) + h + 60) % (h + 60) - 30;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(g.angle);
        ctx.font = `${LAYER_SIZE[g.layer]}px "JetBrains Mono", ui-monospace, monospace`;
        ctx.fillStyle = rgba(g.accent ? colors.accent : colors.fg, g.alpha);
        ctx.fillText(g.ch, 0, 0);
        ctx.restore();
      }

      // Scroll-reactive 3D ASCII objects (v2) — animated frames only, so
      // the reduced-motion still frame stays the plain glyph field.
      if (dt > 0) {
        const p = getScrollProgress();
        const accent = colors.accent;
        if (mobile) {
          const a = windowAlpha(p, 0.02, 0.55);
          if (a > 0.01) {
            drawTorus(
              ctx, w * 0.8, h * 0.78, 54,
              timeS * 0.11 + p * 5, timeS * 0.07 + p * 3,
              accent, 0.4 * a,
            );
          }
        } else {
          const tA = windowAlpha(p, 0.02, 0.48);
          if (tA > 0.01) {
            drawTorus(
              ctx, w * 0.875, h * 0.8, Math.min(104, w * 0.082),
              timeS * 0.11 + p * 5, timeS * 0.07 + p * 3,
              accent, 0.42 * tA,
            );
          }
          const sA = windowAlpha(p, 0.38, 0.78);
          if (sA > 0.01) {
            drawSphere(
              ctx, w * 0.9, h * 0.17, 56,
              timeS * 0.15 + p * 7, 0.5,
              accent, 0.4 * sA,
            );
          }
          const cA = windowAlpha(p, 0.66, 1.05);
          if (cA > 0.01) {
            drawCube(
              ctx, w * 0.875, h * 0.8, 42,
              timeS * 0.2 + p * 6, 0.6 + timeS * 0.13 + p * 2,
              accent, 0.4 * cA,
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
      targetX = (e.clientX / Math.max(w, 1) - 0.5) * 2;
      targetY = (e.clientY / Math.max(h, 1) - 0.5) * 2;
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
      root.setAttribute("data-ascii", "active");
      window.addEventListener("pointermove", onPointer, { passive: true });
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
      <div aria-hidden="true" className="floating-glyphs-vignette" />
    </>
  );
}
