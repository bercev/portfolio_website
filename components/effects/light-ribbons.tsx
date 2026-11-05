"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import { usePalette } from "@/components/providers/palette-provider";
import { REDUCED_MOTION_QUERY } from "@/lib/effect-policy";

/**
 * LightRibbons — run 7: the user-approved Waylume-style animated light
 * background, ported from `~/workspace/deliverables/waylume-variant/`
 * (motion v2 — the version he approved after "make sure it's animated")
 * into the live site as its background layer, replacing the floating
 * glyph field's ambient role.
 *
 * Technique (variant parity): Canvas2D, 4 broad diagonal light sheets
 * in the accent family, rendered as thin vertical slices from soft
 * vertical-gradient sprites onto a half-resolution offscreen, composited
 * additively with a ~4px blur pass (sheets, not strands, no banding).
 * Motion v2 params: phase-travel periods 9–14s, wobble 34–52px /
 * 18–26px, lateral drift ±60–90px on 11.5–14s cycles, vertical glide
 * ±20–30px, brightness breathing ±16–20% on 7.3–8.6s cycles — fast
 * enough that two hero frames 3s apart show obvious ribbon travel.
 *
 * Live-site adaptations (the variant is a standalone FROST page):
 * - Colors come from the LIVE theme tokens, never hardcoded hexes:
 *   --accent-neon is the ribbon family (deep/bright/mid derived by
 *   shade mixes), --effect-glow is the pale ribbon, --background is the
 *   column halo. Sprites rebuild whenever theme or palette changes, so
 *   all 5 palettes keep working. NOTE the FROST remap
 *   (app/globals.css): while data-ascii is active, the page remaps
 *   every accent to ocean #7dd3fc and the background to dark — so in
 *   motion mode the ribbons always read ocean-on-dark, whatever palette
 *   or light/dark setting the visitor chose, because the probe reads the
 *   remapped tokens. Palettes genuinely apply only under reduced motion
 *   (where the remap is off and the controls unlock); the static frame
 *   repaints on palette change so it follows them there. Light mode
 *   draws the same ribbons with normal compositing at halved alpha
 *   (additive would wash out on a light background) — the composite is
 *   keyed off the PROBED background luminance, not the theme setting, so
 *   the remap's forced-dark page still gets additive ribbons.
 * - Content-zone calm: ribbon energy is suppressed inside the live
 *   content column (measured from [data-hero-editorial], the centered
 *   1200px measure every section shares) with a 150px feather, plus a
 *   soft background-colored halo over the column — margins and edges
 *   carry the light, text zones stay dark and crisp.
 * - Pauses when the tab hides; one static frame under reduced motion.
 *
 * Contracts preserved from the glyph field it replaces:
 * - It claims the page background via documentElement[data-journey=
 *   "active"] — EffectStage uses that claim to keep the loud Neural Ink
 *   shader backdrop unmounted. (The attribute name is historical; it
 *   means "background claimed".)
 * - While animating it sets documentElement[data-ascii="active"], which
 *   is what the ASCII portrait bust keys its visibility on.
 * - Under prefers-reduced-motion it paints ONE static frame and does NOT
 *   set data-ascii (the bust is intentionally absent in the static
 *   profile — audited behavior, run-4 iter 26).
 *
 * Retired with the glyph field (its canvas owned them): the scroll 3D
 * objects, chapter pings, keystroke ripple, and contact-transmit burst.
 * The glyph component file stays in the tree unmounted for a later
 * experiment to reintroduce dither/glyph texture over the ribbons.
 */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

type RibbonRole = "deep" | "bright" | "pale" | "accent";

interface RibbonDef {
  y0: number;
  slope: number;
  th: number;
  alpha: number;
  role: RibbonRole;
  a1: number;
  f1: number;
  p1: number;
  a2: number;
  f2: number;
  p2: number;
  drift: number;
  dp: number;
  ga: number;
  gp: number;
  gph: number;
  bd: number;
  bp: number;
  bph: number;
}

/**
 * Ribbon geometry/motion, verbatim from the approved variant (motion v2).
 * y0: centre height at x=0 (fraction of H). slope: px drop per px across.
 * p1/p2 are phase-travel periods; drift/dp a slow lateral pattern shift;
 * ga/gp glide the whole band up/down; bd/bp breathe brightness.
 */
const RIBBONS: ReadonlyArray<RibbonDef> = [
  {
    y0: -0.04, slope: 0.14, th: 205, alpha: 0.44, role: "deep",
    a1: 40, f1: 0.0042, p1: 11000, a2: 20, f2: 0.0095, p2: 13500,
    drift: 70, dp: 13000, ga: 24, gp: 10500, gph: 0.0, bd: 0.18, bp: 8100, bph: 0.0,
  },
  {
    y0: 0.10, slope: 0.20, th: 145, alpha: 0.40, role: "bright",
    a1: 46, f1: 0.0036, p1: 9000, a2: 22, f2: 0.0082, p2: 12000,
    drift: 90, dp: 11500, ga: 28, gp: 12000, gph: 2.1, bd: 0.20, bp: 7300, bph: 1.7,
  },
  {
    y0: 0.03, slope: -0.11, th: 120, alpha: 0.34, role: "pale",
    a1: 34, f1: 0.0051, p1: 12500, a2: 18, f2: 0.011, p2: 9800,
    drift: 60, dp: 14000, ga: 20, gp: 9500, gph: 4.2, bd: 0.16, bp: 8600, bph: 3.4,
  },
  {
    y0: 0.36, slope: 0.28, th: 225, alpha: 0.27, role: "accent",
    a1: 52, f1: 0.0031, p1: 14000, a2: 26, f2: 0.007, p2: 10800,
    drift: 80, dp: 12500, ga: 30, gp: 13500, gph: 1.2, bd: 0.19, bp: 7800, bph: 5.1,
  },
];

const WHITE: Rgb = { r: 255, g: 255, b: 255 };

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

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function scaleRgb(c: Rgb, f: number): Rgb {
  return {
    r: Math.round(c.r * f),
    g: Math.round(c.g * f),
    b: Math.round(c.b * f),
  };
}

function rgba(c: Rgb, a: number): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${a.toFixed(3)})`;
}

/** One ribbon family's colors, derived from the live accent tokens. */
function resolveRibbonColors(
  accent: Rgb,
  glow: Rgb,
): Record<RibbonRole, Rgb> {
  return {
    deep: scaleRgb(accent, 0.55),
    bright: mix(accent, WHITE, 0.28),
    pale: glow,
    accent,
  };
}

function makeSprite(rgb: Rgb): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 2;
  c.height = 128;
  const g = c.getContext("2d");
  if (!g) return c;
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0.0, rgba(rgb, 0));
  grad.addColorStop(0.3, rgba(rgb, 0.35));
  grad.addColorStop(0.5, rgba(rgb, 0.92));
  grad.addColorStop(0.7, rgba(rgb, 0.35));
  grad.addColorStop(1.0, rgba(rgb, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 128);
  return c;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function LightRibbons() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<Record<RibbonRole, HTMLCanvasElement> | null>(
    null,
  );
  const bgRef = useRef<Rgb>({ r: 5, g: 7, b: 12 });
  const accentRef = useRef<Rgb>({ r: 125, g: 211, b: 252 });
  // Under reduced motion there is no loop to pick up rebuilt sprites, so
  // the canvas effect registers a static-frame repaint here that the
  // probe effect below calls after every theme/palette change.
  const repaintStaticRef = useRef<(() => void) | null>(null);
  const { resolvedTheme } = useTheme();
  const { palette } = usePalette();

  // Re-probe theme colors and rebuild sprites whenever theme or palette
  // changes. The draw loop reads these refs, so a palette switch takes
  // effect on the next frame without remounting the canvas; under
  // reduced motion the static frame is repainted explicitly.
  useEffect(() => {
    if (!resolvedTheme) return;
    const accent =
      probeTokenColor("--accent-neon") ?? { r: 125, g: 211, b: 252 };
    const glow =
      probeTokenColor("--effect-glow") ?? { r: 186, g: 230, b: 253 };
    const bg = probeTokenColor("--background") ?? { r: 5, g: 7, b: 12 };
    accentRef.current = accent;
    bgRef.current = bg;
    const colors = resolveRibbonColors(accent, glow);
    spritesRef.current = {
      deep: makeSprite(colors.deep),
      bright: makeSprite(colors.bright),
      pale: makeSprite(colors.pale),
      accent: makeSprite(colors.accent),
    };
    repaintStaticRef.current?.();
  }, [resolvedTheme, palette]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !resolvedTheme) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const off = document.createElement("canvas");
    const octx = off.getContext("2d");
    if (!octx) return;
    // Per-draw ctx.filter blur is the final softening pass. Detect on the
    // prototype — assigning the property on an unsupported context would
    // silently create an expando and lie.
    const filterOK =
      typeof CanvasRenderingContext2D !== "undefined" &&
      "filter" in CanvasRenderingContext2D.prototype;

    const root = document.documentElement;
    const reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    // Claim the background immediately so EffectStage never flashes the
    // shader backdrop under the ribbons.
    root.dataset.journey = "active";
    let disposed = false;
    let raf = 0;

    const S = 0.5;
    let W = 0;
    let H = 0;
    let colL = 0;
    let colR = 0;

    /** Content column: the hero editorial measure every section shares.
     * Inset by the element's inline padding so the TEXT zone (not the
     * padded box) defines suppression — on a 390px viewport the box
     * spans the full width, which left no full-energy margin at all and
     * the motion pair read static at the edges. */
    const measure = () => {
      const el = document.querySelector("[data-hero-editorial]");
      if (el) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const pl = parseFloat(cs.paddingLeft) || 0;
        const pr = parseFloat(cs.paddingRight) || 0;
        colL = r.left + pl;
        colR = r.right - pr;
        return;
      }
      // Fallback: the centered 1200px measure from --journey-content-max.
      const maxRaw =
        getComputedStyle(root).getPropertyValue("--journey-content-max");
      const max = parseFloat(maxRaw) || 1200;
      const pad = Math.min(64, Math.max(16, W * 0.05));
      const half = Math.min(W / 2 - pad, max / 2);
      colL = W / 2 - half;
      colR = W / 2 + half;
    };

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      off.width = Math.max(2, Math.ceil(W * S));
      off.height = Math.max(2, Math.ceil(H * S));
      measure();
    };

    // Ribbon energy multiplier at a point: suppressed inside the content
    // column (feathered edges), fading gently with depth down the viewport.
    const energy = (x: number, y: number): number => {
      const F = 150;
      // Narrow screens: less suppression inside the column — the text is
      // large there and the bands need to stay visible at phone scale.
      const minS = W < 700 ? 0.6 : 0.34;
      let sx: number;
      if (x < colL) sx = minS + (1 - minS) * smooth(0, F, colL - x);
      else if (x > colR) sx = minS + (1 - minS) * smooth(0, F, x - colR);
      else sx = minS;
      const vf = 1 - 0.5 * smooth(H * 0.12, H * 0.85, y);
      return sx * vf;
    };

    const centerY = (r: RibbonDef, x: number, t: number): number => {
      const ph = r.drift * Math.sin((t * 6.2832) / r.dp);
      return (
        r.y0 * H +
        r.slope * x +
        r.ga * Math.sin((t * 6.2832) / r.gp + r.gph) +
        r.a1 * Math.sin((x + ph) * r.f1 + (t * 6.2832) / r.p1) +
        r.a2 * Math.sin((x - ph * 0.6) * r.f2 - (t * 6.2832) / r.p2)
      );
    };

    const thick = (r: RibbonDef, x: number, t: number): number =>
      r.th * (0.78 + 0.22 * Math.sin(x * 0.0021 + (t * 6.2832) / 12500));

    const draw = (t: number) => {
      const sprites = spritesRef.current;
      if (!sprites) return;
      const bg = bgRef.current;
      const accent = accentRef.current;
      // Composite off the PROBED background luminance, not the theme
      // setting: the FROST remap forces a dark page while the ribbons
      // animate even when the visitor chose light mode, and that page
      // must get additive ribbons; a genuinely light page (reduced
      // motion, remap off) gets normal compositing at halved alpha,
      // since additive would wash out on it.
      const bgLum = (0.2126 * bg.r + 0.7152 * bg.g + 0.0722 * bg.b) / 255;
      const dark = bgLum < 0.5;
      // Light mode: normal compositing at halved alpha (additive would
      // wash out on a light background). Dark mode: additive, as approved.
      const alphaScale = dark ? 1 : 0.5;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      // A whisper of top glow, in the live accent.
      const top = ctx.createLinearGradient(0, 0, 0, H * 0.5);
      top.addColorStop(0, rgba(accent, dark ? 0.12 : 0.06));
      top.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, W, H * 0.5);

      // Ribbons on the half-res offscreen, additive in dark mode.
      octx.clearRect(0, 0, off.width, off.height);
      octx.globalCompositeOperation = dark ? "lighter" : "source-over";
      const step = 1; // offscreen px (~2 css px) — dense slices, no striping
      for (let ri = 0; ri < RIBBONS.length; ri++) {
        const r = RIBBONS[ri];
        // Brightness breathing: gentle intensity swell, ±16–20% over ~7–9s.
        const ba =
          r.alpha * alphaScale * (1 + r.bd * Math.sin((t * 6.2832) / r.bp + r.bph));
        for (let ox = 0; ox < off.width; ox += step) {
          const xCss = (ox + step / 2) / S;
          const cCss = centerY(r, xCss, t);
          const a = ba * energy(xCss, cCss);
          if (a < 0.004) continue;
          const thPx = thick(r, xCss, t) * S;
          octx.globalAlpha = Math.min(1, a);
          octx.drawImage(
            sprites[r.role],
            ox,
            cCss * S - thPx / 2,
            step + 1,
            thPx,
          );
        }
      }
      octx.globalAlpha = 1;
      if (filterOK) {
        try {
          ctx.filter = "blur(4px)";
        } catch {
          /* unsupported — ribbons render crisp, no crash */
        }
      }
      ctx.drawImage(off, 0, 0, W, H);
      if (filterOK) {
        try {
          ctx.filter = "none";
        } catch {
          /* ignore */
        }
      }

      // Soft dark halo over the content column: text stays crisp anywhere.
      // Lighter on narrow screens, where it would otherwise dim the whole
      // viewport (the column spans it) and hide the bands at phone scale.
      const haloA = W < 700 ? 0.25 : 0.4;
      const F2 = 150;
      const colW = Math.max(1, colR - colL);
      const GL = colW + 2 * F2;
      const halo = ctx.createLinearGradient(colL - F2, 0, colR + F2, 0);
      halo.addColorStop(0, rgba(bg, 0));
      halo.addColorStop(F2 / GL, rgba(bg, haloA));
      halo.addColorStop((F2 + colW) / GL, rgba(bg, haloA));
      halo.addColorStop(1, rgba(bg, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);
    };

    const loop = (now: number) => {
      if (disposed) return;
      if (!document.hidden) draw(now || 0);
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      if (document.hidden) {
        // Pause the work, not only the pixels: cancel the tick so no frame
        // is scheduled while hidden. The browser would pause rAF anyway;
        // cancelling makes the resume deterministic.
        cancelAnimationFrame(raf);
        return;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        if (reduced) draw(12000);
      }, 150);
    };

    resize();
    if (reduced) {
      draw(12000); // one deliberate still frame; bust stays absent by design
      // Palette/theme changes under reduced motion repaint the static
      // frame (there is no loop to pick up rebuilt sprites).
      repaintStaticRef.current = () => {
        if (disposed) return;
        resize();
        draw(12000);
      };
    } else {
      root.setAttribute("data-ascii", "active");
      document.addEventListener("visibilitychange", onVisibility);
      raf = requestAnimationFrame(loop);
    }
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      repaintStaticRef.current = null;
      window.removeEventListener("resize", onResize);
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
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="light-ribbons"
      data-light-ribbons
    />
  );
}
