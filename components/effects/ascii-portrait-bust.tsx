"use client";

import { useEffect, useRef, useState } from "react";

import { getScrollProgress, smoothstep01, useScrollBlur, useScrollDive } from "@/lib/scroll-fx";

/**
 * AsciiPortraitBust — Figure system v2 (replaces the hand-rolled
 * AsciiPerson3D 3D-glyph humanoid, which never read in any screenshot across
 * many tuning iterations).
 *
 * Renders a real portrait bust — derived from the user's profile photo
 * (public/images/portrait-bust.jpg; background crushed so the figure reads
 * as a clean silhouette) — as FROST-tinted ASCII art, in the glyph language
 * of the Aceternity UI ASCII Art component it originally used (registry:
 * https://ui.aceternity.com/registry/ascii-art.json; "standard" charset).
 * The monochrome dithered target look comes from the user's "unslop"
 * reference (dither / noise / ASCII).
 *
 * Scroll-reactive background v2 (2026-10-23 — user: "Make my head rotate
 * and stuff"): the Aceternity static renderer is replaced by an in-house
 * point-relief renderer. The bust image is sampled into a point grid —
 * x/y from the pixel grid, depth (z) from luminance — and the points are
 * rotated around the vertical (Y) axis and projected back to 2D ASCII
 * glyphs, with alpha keyed to facing so the far side melts away as it
 * turns. Rotation behavior: a monotonic turn driven by scroll progress —
 * front view at the hero, eased (smoothstep) to ~57° by the contact
 * section — plus a ±3° idle sway so the head feels alive on a still page.
 *
 * Same visibility contract as the old figure: only when the background's
 * ASCII mode is active (documentElement[data-ascii="active"]) and on
 * desktop widths (>= 900px). Under reduced motion the background never
 * sets data-ascii, so the bust stays absent — unchanged. As a background
 * layer it also picks up the progressive scroll blur (lib/scroll-fx).
 */

const BUST_RAMP = " .,:;i1tfLCG08@"; // Aceternity "standard" charset
const BUST_COLOR = "#7dd3fc";
const BUST_MAX_TURN = 1.0; // radians ≈ 57° across the full page scroll
const BUST_GRID = 84; // source image is 84×84

interface BustPoint {
  u: number; // -1..1 across
  v: number; // -1..1 down
  w: number; // relief depth from luminance
  lum: number; // 0..1
}

function RotatingBustCanvas(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let disposed = false;
    let raf = 0;
    let points: BustPoint[] = [];
    let cssSize = 0;
    let dpr = 1;
    let timeS = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cssSize = canvas.clientWidth;
      canvas.width = Math.round(cssSize * dpr);
      canvas.height = Math.round(cssSize * dpr);
    };

    const draw = () => {
      if (!cssSize || points.length === 0) return;
      const p = getScrollProgress();
      const A =
        BUST_MAX_TURN * smoothstep01(p) + 0.055 * Math.sin(timeS * 0.3);
      const cosA = Math.cos(A);
      const sinA = Math.sin(A);
      const half = cssSize / 2;
      const scale = half * 0.94;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssSize, cssSize);
      ctx.font = `${Math.max(4, (cssSize / BUST_GRID) * 2.3)}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = BUST_COLOR;
      // Two passes — far side (zr < 0) first, then the facing side — a
      // cheap painter's algorithm so turned-away points never paint over
      // the face as the head rotates.
      for (let pass = 0; pass < 2; pass++) {
        for (const pt of points) {
          const xr = pt.u * cosA + pt.w * sinA;
          const zr = pt.w * cosA - pt.u * sinA;
          if ((pass === 0) !== (zr < 0)) continue;
          // Facing factor: points rotated to the far side fade out.
          const facing = Math.min(1, Math.max(0, (zr + 1.05) / 2.1));
          ctx.globalAlpha = 0.9 * (0.18 + 0.82 * facing);
          const idx = Math.min(
            BUST_RAMP.length - 1,
            Math.floor(pt.lum * BUST_RAMP.length),
          );
          ctx.fillText(BUST_RAMP[idx], half + xr * scale, half + pt.v * scale);
        }
      }
      ctx.globalAlpha = 1;
    };

    // ~15fps tick: sway and scroll turns are slow, and the tick keeps the
    // bust in the background's battery-conscious cadence family. rAF
    // pauses itself when the tab is hidden.
    const TICK_S = 1 / 15;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      if (disposed) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      acc += dt;
      timeS += dt;
      if (acc >= TICK_S) {
        draw();
        acc = 0;
      }
      raf = requestAnimationFrame(loop);
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        draw();
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
      // Sample the bust into a point relief: x/y from the pixel grid,
      // depth from luminance. The source's background is crushed to
      // black, so near-black pixels are skipped entirely.
      const img = new Image();
      img.src = "/images/portrait-bust.jpg";
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
      if (disposed || !img.naturalWidth) return;
      const off = document.createElement("canvas");
      off.width = BUST_GRID;
      off.height = BUST_GRID;
      const octx = off.getContext("2d");
      if (!octx) return;
      octx.drawImage(img, 0, 0, BUST_GRID, BUST_GRID);
      const data = octx.getImageData(0, 0, BUST_GRID, BUST_GRID).data;
      const pts: BustPoint[] = [];
      for (let y = 0; y < BUST_GRID; y++) {
        for (let x = 0; x < BUST_GRID; x++) {
          const lum = data[(y * BUST_GRID + x) * 4] / 255;
          if (lum < 0.05) continue;
          pts.push({
            u: (x / (BUST_GRID - 1)) * 2 - 1,
            v: (y / (BUST_GRID - 1)) * 2 - 1,
            w: (lum - 0.45) * 0.85,
            lum,
          });
        }
      }
      points = pts;
      draw();
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    void start();
    window.addEventListener("resize", onResize);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 block h-full w-full"
    />
  );
}

export function AsciiPortraitBust(): React.JSX.Element | null {
  const [asciiActive, setAsciiActive] = useState(false);
  const [wide, setWide] = useState(false);
  // Wrapper-level mount fade (a canvas remount mid-fade would lose the
  // drawn frame; fading the wrapper avoids that whole class of bug).
  const [fadedIn, setFadedIn] = useState(false);
  // Progressive scroll blur (v2): the bust is a background layer, so it
  // blurs with scroll depth alongside the glyph canvas.
  const blurRef = useScrollBlur<HTMLDivElement>(5, asciiActive && wide);
  // Scroll dive (run-2 IDEA iter 1): the head sinks and grows slightly as
  // you scroll past it — the viewer passes the portrait, it doesn't sit
  // still. Applied to the bust's own box (transform-origin = its center);
  // compositor-only, quantized, and off under reduced motion like the blur.
  const diveRef = useScrollDive<HTMLDivElement>(64, 0.08, asciiActive && wide);
  useEffect(() => {
    if (!asciiActive || !wide) return;
    setFadedIn(false);
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setFadedIn(true)),
    );
    return () => cancelAnimationFrame(raf);
  }, [asciiActive, wide]);

  // Gate on ASCII mode + desktop widths (same contract as the old figure).
  useEffect(() => {
    const root = document.documentElement;
    const syncAscii = () =>
      setAsciiActive(root.getAttribute("data-ascii") === "active");
    syncAscii();
    const mo = new MutationObserver(syncAscii);
    mo.observe(root, { attributes: true, attributeFilter: ["data-ascii"] });

    const mq = window.matchMedia("(min-width: 900px)");
    const syncWide = () => setWide(mq.matches);
    syncWide();
    mq.addEventListener("change", syncWide);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", syncWide);
    };
  }, []);

  if (!asciiActive || !wide) return null;

  return (
    <div
      ref={blurRef}
      aria-hidden="true"
      data-ascii-portrait-bust
      style={{
        position: "fixed",
        inset: 0,
        // Layering: above the journey scene (2) AND the content-frost blur (5)
        // — a 14px backdrop blur would dissolve the fine ASCII glyphs — but
        // below page content (10) so text always paints over the figure, and
        // well below header/nav (40/50).
        zIndex: 8,
        pointerEvents: "none",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        // The bust faces left (toward the content) — park it right of center
        // with a viewport-relative margin so it never crowds the headline.
        paddingRight: "clamp(1.5rem, 5vw, 5rem)",
        opacity: fadedIn ? 1 : 0,
        transition: "opacity 1400ms ease",
        // Soft vignette: the dense ASCII block must read as background
        // texture, never as a hard rectangle competing with text painted
        // over it (z-10 content sits above). Fades the canvas edges so the
        // bust melts into the scene instead of butting against copy —
        // e.g. the about chapter's education panel.
        maskImage:
          "radial-gradient(ellipse 64% 64% at 50% 46%, black 52%, transparent 98%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 64% 64% at 50% 46%, black 52%, transparent 98%)",
      }}
    >
      <div
        style={{
          // Melt the content-facing (left) edge of the bust into the
          // background. The bust's left edge sits behind right-side copy —
          // publications venue/[cite], skills marquee pills, experience pill
          // tags, projects sidecar — and the wrapper's viewport-relative
          // radial vignette only softens the bust's outer edges, not the
          // edge facing the text. A linear left-fade clears the overlap
          // zone while the figure's core stays readable (research iter 51:
          // W3C "do not overlay words on busy backgrounds").
          maskImage: "linear-gradient(to right, transparent 0%, black 34%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 34%)",
        }}
      >
        <div
          ref={diveRef}
          // Dimmed for the simplified background (research iter 51, W3C
          // foreground-obscured pattern + crossfeyer legibility): on the calm
          // glyph field the bust at opacity-40 reads as quiet background
          // texture while the figure still registers; the iter-10 vignette
          // mask + size (about clearance) are untouched by the v2 renderer.
          // useScrollDive drives this box's transform (scroll sinks + grows).
          className="relative aspect-square w-[clamp(200px,22vw,300px)] opacity-40"
        >
          <RotatingBustCanvas />
        </div>
      </div>
    </div>
  );
}
