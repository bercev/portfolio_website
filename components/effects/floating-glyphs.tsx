"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import { usePalette } from "@/components/providers/palette-provider";
import { MOBILE_QUERY, REDUCED_MOTION_QUERY } from "@/lib/effect-policy";
import { useScrollBlur } from "@/lib/scroll-fx";

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
    };

    // Cadence throttle (iter-53): the glyph field moves 2-9 px/s with
    // <=0.12 rad/s spin — imperceptible frame-to-frame, so full-rate
    // redraws are pure GPU/battery burn on a page that sits open (the
    // iter-28 BERAT needsFrames() precedent; Magic UI Glyph Matrix's 90ms
    // tick is the same precedent). rAF still drives the cadence (no wake
    // plumbing needed), but draw only fires on an ~83ms tick: ~5x less
    // frame work. Physics advance on the accumulated dt, so visible
    // motion is identical; pointer/scroll parallax keep updating on the
    // tick. The reduced-motion single-frame path (dt=0) is untouched.
    const TICK_S = 1 / 12;
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
