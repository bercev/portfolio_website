"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import { usePalette } from "@/components/providers/palette-provider";
import { REDUCED_MOTION_QUERY } from "@/lib/effect-policy";
import { resolveActiveChapter } from "./light-ribbons";

/**
 * BlueprintField — run 9, RUN9-BACKGROUND-SYSTEM (reel-11 menu:
 * blueprint grids, square dot grids, stippled gradients).
 *
 * The "drafting-table" background: a fixed Canvas2D layer ABOVE the
 * light ribbons (z-journey-scene + 1) and BELOW the content frost that
 * re-reads the whole page as drafting paper:
 *
 *  1. Veil — a background-colored wash over the ribbons, so the run-7
 *     light reads as glow under paper instead of the whole background.
 *  2. Blueprint grid — fine cell + major lines every 5 cells, rotated
 *     per chapter, theme-token accent at low alpha.
 *  3. Stipple dot field — a square dot grid in the MARGINS only (never
 *     behind text), dots breathing ±18% on a 7s wave so the paper is
 *     alive at rest.
 *  4. Registration marks — "+" crosses at every 3rd major intersection
 *     in the margins.
 *  5. Column calm — a feathered background wash over the text column
 *     (same 150px feather the ribbons use) so grid + ribbons stay out
 *     of the reading zone.
 *
 * Per-section chapters (run-7's data-light-chapter sections, viewport
 * center) lerp angle / cell / dot size / veil over ~600ms, exactly like
 * the ribbon chapters. Scroll parallax drags the grid with the page.
 *
 * Reduced motion: one static frame of the active chapter, repainted on
 * scroll (debounced) and theme change — no loop, no breathing.
 * Colors come from the LIVE theme tokens only (probed like the ribbons);
 * light backgrounds get stronger line alphas since cyan-on-white needs
 * them. Nothing here touches the data-journey / data-ascii contracts —
 * the ASCII bust still keys on the ribbons' claim.
 */

export interface BlueprintProfile {
  /** Grid rotation, degrees. */
  angle: number;
  /** Fine-grid cell, px. */
  cell: number;
  /** Grid line alpha multiplier. */
  gridAlpha: number;
  /** Stipple dot radius, px. */
  dotRadius: number;
  /** Stipple dot alpha multiplier. */
  dotAlpha: number;
  /** Veil (background wash) alpha over the ribbons. */
  veil: number;
}

export const BLUEPRINT_PROFILES: Record<string, BlueprintProfile> = {
  hero: { angle: 0, cell: 26, gridAlpha: 1, dotRadius: 1.6, dotAlpha: 1, veil: 0.2 },
  about: { angle: -4, cell: 24, gridAlpha: 1.1, dotRadius: 1.8, dotAlpha: 1, veil: 0.22 },
  publications: { angle: 3, cell: 30, gridAlpha: 0.9, dotRadius: 1.4, dotAlpha: 1, veil: 0.18 },
  experience: { angle: -2, cell: 26, gridAlpha: 1, dotRadius: 2, dotAlpha: 1.1, veil: 0.22 },
  projects: { angle: 5, cell: 22, gridAlpha: 1.25, dotRadius: 1.8, dotAlpha: 1.1, veil: 0.24 },
  skills: { angle: 0, cell: 20, gridAlpha: 1.1, dotRadius: 2.2, dotAlpha: 1.2, veil: 0.2 },
  contact: { angle: -5, cell: 30, gridAlpha: 0.85, dotRadius: 1.5, dotAlpha: 0.9, veil: 0.26 },
  epilogue: { angle: 0, cell: 26, gridAlpha: 0.8, dotRadius: 1.4, dotAlpha: 0.9, veil: 0.28 },
};

export function getBlueprintProfile(name: string | null): BlueprintProfile {
  return BLUEPRINT_PROFILES[name ?? ""] ?? BLUEPRINT_PROFILES.hero;
}

export function lerpBlueprintProfile(
  a: BlueprintProfile,
  b: BlueprintProfile,
  k: number,
): BlueprintProfile {
  return {
    angle: a.angle + (b.angle - a.angle) * k,
    cell: a.cell + (b.cell - a.cell) * k,
    gridAlpha: a.gridAlpha + (b.gridAlpha - a.gridAlpha) * k,
    dotRadius: a.dotRadius + (b.dotRadius - a.dotRadius) * k,
    dotAlpha: a.dotAlpha + (b.dotAlpha - a.dotAlpha) * k,
    veil: a.veil + (b.veil - a.veil) * k,
  };
}

const smooth01 = (x: number): number => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

type Rgb = { r: number; g: number; b: number };

function probeTokenColor(token: string): Rgb | null {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const raw = getComputedStyle(probe).color;
  probe.remove();
  const m = raw.match(/[\d.]+/g);
  if (!m || m.length < 3) return null;
  const scale = raw.startsWith("color(") ? 255 : 1;
  return {
    r: Math.round(parseFloat(m[0]) * scale),
    g: Math.round(parseFloat(m[1]) * scale),
    b: Math.round(parseFloat(m[2]) * scale),
  };
}

const rgba = (c: Rgb, a: number): string =>
  `rgba(${c.r}, ${c.g}, ${c.b}, ${a.toFixed(3)})`;

const luminance = (c: Rgb): number => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

/** Dot-grid spacing, px (fixed; radius/alpha carry the chapter). */
const DOT_SPACING = 16;
/** Column feather, px — same value the ribbons use. */
const FEATHER = 150;
/** Breathing period for the stipple dots, seconds. */
const BREATHE_PERIOD_S = 7;

export function BlueprintField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const { palette } = usePalette();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !resolvedTheme) return;
    const root = document.documentElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    let disposed = false;
    let raf = 0;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let colL = 0;
    let colR = 0;
    let accent: Rgb = { r: 125, g: 211, b: 252 };
    let bg: Rgb = { r: 9, g: 14, b: 22 };
    let light = false;
    let chapterActive: string | null = null;
    let chapterFrom: BlueprintProfile = { ...BLUEPRINT_PROFILES.hero };
    let chapterTarget: BlueprintProfile = { ...BLUEPRINT_PROFILES.hero };
    let chapterCur: BlueprintProfile = { ...BLUEPRINT_PROFILES.hero };
    let chapterTweenStart = 0;
    let lastScrollY = -1;
    let lastH = -1;
    let lastDraw = 0;

    const probeThemeTokens = () => {
      accent = probeTokenColor("--accent-neon") ?? accent;
      bg = probeTokenColor("--background") ?? bg;
      light = luminance(bg) > 128;
    };

    const measureColumn = () => {
      const el = document.querySelector("[data-hero-editorial]");
      if (el) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        colL = r.left + (parseFloat(cs.paddingLeft) || 0);
        colR = r.right - (parseFloat(cs.paddingRight) || 0);
        return;
      }
      const maxRaw = getComputedStyle(root).getPropertyValue(
        "--journey-content-max",
      );
      const max = parseFloat(maxRaw) || 1200;
      const pad = Math.min(64, Math.max(16, W * 0.05));
      const half = Math.min(W / 2 - pad, max / 2);
      colL = W / 2 - half;
      colR = W / 2 + half;
    };

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      measureColumn();
    };

    const updateChapter = (now: number) => {
      if (window.scrollY === lastScrollY && H === lastH) return;
      lastScrollY = window.scrollY;
      lastH = H;
      const rects = Array.from(
        document.querySelectorAll("[data-light-chapter]"),
      ).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          name: el.getAttribute("data-light-chapter") ?? "hero",
          top: r.top,
          bottom: r.bottom,
        };
      });
      const active = resolveActiveChapter(
        rects,
        window.innerHeight / 2,
        window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 2,
      );
      if (!active || active === chapterActive) return;
      chapterActive = active;
      chapterFrom = { ...chapterCur };
      chapterTarget = getBlueprintProfile(active);
      chapterTweenStart = now;
      canvas.dataset.activeChapter = active;
      if (reduced) {
        chapterCur = { ...chapterTarget };
        chapterFrom = { ...chapterTarget };
      }
    };

    const stepChapter = (now: number) => {
      const k = smooth01((now - chapterTweenStart) / 600);
      chapterCur = lerpBlueprintProfile(chapterFrom, chapterTarget, k);
    };

    const draw = (now: number) => {
      if (W === 0) return;
      updateChapter(now);
      if (!reduced) stepChapter(now);
      const p = chapterCur;
      const scrollY = window.scrollY;
      const t = now / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // 1. Veil — drafting paper over the ribbons.
      ctx.fillStyle = rgba(bg, p.veil * (light ? 0.45 : 1));
      ctx.fillRect(0, 0, W, H);

      // 2. Blueprint grid, rotated by the chapter angle, parallaxed
      //    with scroll so the paper drags as you move through it.
      const diag = Math.hypot(W, H);
      const offY = ((scrollY * 0.04) % p.cell + p.cell) % p.cell;
      const narrow = W < 700;
      const fineA =
        0.09 * p.gridAlpha * (light ? 2 : 1) * (narrow ? 1.6 : 1);
      const majorA =
        0.2 * p.gridAlpha * (light ? 1.8 : 1) * (narrow ? 1.5 : 1);
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate((p.angle * Math.PI) / 180);
      ctx.translate(-W / 2, -H / 2);
      // Narrow screens: 1px lines at low alpha are faint at normal
      // scale no matter the alpha (two alpha bumps proved it) — the
      // grid needs WEIGHT there, not more opacity.
      const fineW = narrow ? 1.5 : 1;
      const majorW = narrow ? 2 : 1;
      // Grid lines are drawn axis-aligned in the rotated frame; the
      // major index is counted from the viewport origin so majors stay
      // put while the fine grid parallax-scrolls.
      const x0 = -diag / 2 - p.cell;
      const x1 = diag / 2 + p.cell;
      const y0 = -diag / 2 - p.cell;
      const y1 = diag / 2 + p.cell;
      let i = 0;
      for (let x = x0; x <= x1; x += p.cell, i += 1) {
        const major = i % 5 === 0;
        ctx.strokeStyle = rgba(accent, major ? majorA : fineA);
        ctx.lineWidth = major ? majorW : fineW;
        ctx.beginPath();
        ctx.moveTo(x, y0 + offY);
        ctx.lineTo(x, y1 + offY);
        ctx.stroke();
      }
      let j = 0;
      for (let y = y0 + offY; y <= y1; y += p.cell, j += 1) {
        const major = j % 5 === 0;
        ctx.strokeStyle = rgba(accent, major ? majorA : fineA);
        ctx.lineWidth = major ? majorW : fineW;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
      }
      ctx.restore();

      // 3. Stipple dots in the margins only, breathing on a 7s wave.
      const dotOff = ((scrollY * 0.08) % DOT_SPACING + DOT_SPACING) % DOT_SPACING;
      const dotA = 0.16 * p.dotAlpha * (light ? 1.6 : 1);
      ctx.fillStyle = rgba(accent, dotA);
      for (let x = DOT_SPACING / 2; x < W; x += DOT_SPACING) {
        if (x > colL - 24 && x < colR + 24) continue;
        for (let y = DOT_SPACING / 2 + dotOff; y < H; y += DOT_SPACING) {
          const phase = x * 0.01 + y * 0.013;
          const breathe = reduced
            ? 1
            : 1 + 0.18 * Math.sin((2 * Math.PI * t) / BREATHE_PERIOD_S + phase);
          const r = Math.max(0.4, p.dotRadius * breathe);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4. Registration marks at every 3rd major intersection, margins.
      const majorCell = p.cell * 5;
      const regA = 0.22 * p.gridAlpha * (light ? 1.5 : 1);
      ctx.strokeStyle = rgba(accent, regA);
      ctx.lineWidth = 1;
      const arm = 5;
      for (let x = majorCell; x < W; x += majorCell * 3) {
        if (x > colL - 24 && x < colR + 24) continue;
        for (let y = majorCell; y < H; y += majorCell * 3) {
          ctx.beginPath();
          ctx.moveTo(x - arm, y);
          ctx.lineTo(x + arm, y);
          ctx.moveTo(x, y - arm);
          ctx.lineTo(x, y + arm);
          ctx.stroke();
        }
      }

      // 5. Column calm — feathered background wash over the text zone.
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      const calmA = 0.32 * (light ? 0.7 : 1) * (W < 700 ? 0.3 : 1);
      grad.addColorStop(0, rgba(bg, 0));
      grad.addColorStop(Math.max(0, (colL - FEATHER) / W), rgba(bg, 0));
      grad.addColorStop(Math.min(1, colL / W), rgba(bg, calmA));
      grad.addColorStop(Math.max(0, colR / W), rgba(bg, calmA));
      grad.addColorStop(Math.min(1, (colR + FEATHER) / W), rgba(bg, 0));
      grad.addColorStop(1, rgba(bg, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    };

    const loop = (now: number) => {
      if (disposed) return;
      // 15fps throttle: the breathing dots are a slow wave, the grid a
      // slow parallax — no need to repaint at display rate.
      if (now - lastDraw >= 66 || chapterActive === null) {
        lastDraw = now;
        draw(now);
      }
      raf = requestAnimationFrame(loop);
    };

    resize();
    probeThemeTokens();
    updateChapter(performance.now());
    chapterCur = { ...chapterTarget };
    chapterFrom = { ...chapterTarget };

    let reducedScrollTimer = 0;
    const onReducedScroll = () => {
      window.clearTimeout(reducedScrollTimer);
      reducedScrollTimer = window.setTimeout(() => {
        if (disposed) return;
        draw(performance.now());
      }, 150);
    };
    const onResize = () => {
      resize();
      draw(performance.now());
    };
    // Palette/theme changes re-probe tokens and repaint (the tokens
    // themselves live on the root; the remap can flip without a
    // resolvedTheme change).
    const tokenObserver = new MutationObserver(() => {
      probeThemeTokens();
      draw(performance.now());
    });
    tokenObserver.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme", "data-palette", "class"],
    });

    if (reduced) {
      draw(performance.now());
      window.addEventListener("scroll", onReducedScroll, { passive: true });
    } else {
      raf = requestAnimationFrame(loop);
    }
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(reducedScrollTimer);
      tokenObserver.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onReducedScroll);
    };
  }, [resolvedTheme, palette]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="blueprint-field"
      data-blueprint-field
    />
  );
}
