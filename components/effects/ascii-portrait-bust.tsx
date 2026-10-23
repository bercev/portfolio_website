"use client";

import { useEffect, useRef, useState } from "react";

import { approachAngle, bustLightPresence, bustRimLight, bustRimShaped, BUST_RIM_LUM, BUST_RIM_MAX, bustWipeDepth, BUST_WIPE_NOISE_K, fbm2, gazeAngles, getScrollProgress, scrollShared, smoothstep01, useScrollBlur, useScrollDive } from "@/lib/scroll-fx";

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
 * Pointer gaze (run-2 iter 5 — "make my head rotate and stuff"): the head
 * additionally turns toward the pointer (yaw ±7°, nod ±4°) on a ~1s
 * low-pass, composed onto the scroll turn — a person-like head turn, never
 * a whip. Geometry is arithmetic (no layout reads); the bust never mounts
 * under reduced motion, so there is no RM branch to audit.
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

    // Gaze tracking (run-2 IDEA iter 5): the head turns toward the pointer —
    // a slow, person-like head turn composed onto the scroll turn, so the
    // portrait feels alive between scroll gestures. Yaw ±7°, pitch ±4°,
    // ~1s low-pass convergence. All geometry is derived arithmetically (the
    // box is fixed right-of-center at viewport mid-height plus the dive
    // sink, so there are no per-tick layout reads.
    const GAZE_YAW = 0.12; // rad ≈ 7°
    const GAZE_PITCH = 0.07; // rad ≈ 4°
    const DIVE_SINK_PX = 64; // must match the useScrollDive sink on the box
    let gazeYaw = 0;
    let gazePitch = 0;
    let lastPX: number | null = null;
    let lastPY: number | null = null;
    let gazeHalf = 150; // box half-extent, CSS px
    let gazeCenterX = 0; // box center, viewport px (centerY is mid-height + dive)

    // Pointer rim light (run-2 IDEA iter 13 — "one light, whole scene"):
    // the pointer light that washes the glyph field also lights the
    // bust's point relief. Presence eases toward the distance-falloff
    // target with the same ~1s low-pass as the gaze and relaxes to
    // exactly 0 when the pointer leaves (lastPX nulls on
    // pointerleave/visibilitychange), so the at-rest render is provably
    // identical to the unlit one (the lift term is skipped entirely at
    // presence 0).
    let lightU = 0; // pointer offset in the bust's own units (rim-light dir)
    let lightV = 0;
    let lightPresence = 0; // eased 0..1 — exactly 0 at rest

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cssSize = canvas.clientWidth;
      canvas.width = Math.round(cssSize * dpr);
      canvas.height = Math.round(cssSize * dpr);
      // Gaze geometry mirrors the wrapper layout: fixed, flex-end +
      // items-center, paddingRight clamp(1.5rem, 5vw, 5rem), box
      // w-[clamp(200px,22vw,300px)].
      const vw = window.innerWidth;
      const boxW = Math.min(300, Math.max(200, 0.22 * vw));
      gazeHalf = boxW / 2;
      const rootFont =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const padRight = Math.min(
        5 * rootFont,
        Math.max(1.5 * rootFont, 0.05 * vw),
      );
      gazeCenterX = vw - padRight - gazeHalf;
    };

    const draw = () => {
      if (!cssSize || points.length === 0) return;
      const p = getScrollProgress();
      // Scroll turn + idle sway + pointer gaze, composed into one rotation.
      const A =
        BUST_MAX_TURN * smoothstep01(p) +
        0.055 * Math.sin(timeS * 0.3) +
        gazeYaw;
      const P = gazePitch;
      const cosA = Math.cos(A);
      const sinA = Math.sin(A);
      const cosP = Math.cos(P);
      const sinP = Math.sin(P);
      const half = cssSize / 2;
      const scale = half * 0.94;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssSize, cssSize);
      ctx.font = `${Math.max(4, (cssSize / BUST_GRID) * 2.3)}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = BUST_COLOR;
      // Chapter-boundary dither tear (run-2 IDEA iter 14 — "the head tears
      // at the boundary"): the head dissolves through the same hard-edged
      // fbm front as the glyph field's noise wipe, then re-forms as the
      // new chapter settles. The depth is triangular on the shared wipe
      // threshold — exactly 0 at rest (wipeThr 0/1), so the gate is
      // skipped entirely and the at-rest render is byte-identical to the
      // pre-tear one. The noise is evaluated in the point's own (u, v) —
      // anchored to the head, never boiling — and the 0.55 cap keeps the
      // head readable at the tear's peak (deliberate dither, not a glitch).
      // Skipped under reduced motion by construction: the bust never
      // mounts there (scrollShared.wipeThr stays at its rest default 0).
      const wipeDepth = bustWipeDepth(scrollShared.wipeThr);
      // Two passes — far side (zr < 0) first, then the facing side — a
      // cheap painter's algorithm so turned-away points never paint over
      // the face as the head rotates.
      for (let pass = 0; pass < 2; pass++) {
        for (const pt of points) {
          // Dither tear: drop points under the front (same contract as
          // the pure bustWipeDrop, inlined against the precomputed depth).
          if (
            wipeDepth > 0 &&
            fbm2(pt.u * BUST_WIPE_NOISE_K, pt.v * BUST_WIPE_NOISE_K) <
              wipeDepth
          )
            continue;
          // Pitch (nod) first, then yaw — both in the point's own space so
          // the depth relief reads correctly from every angle.
          const v1 = pt.v * cosP - pt.w * sinP;
          const w1 = pt.v * sinP + pt.w * cosP;
          const xr = pt.u * cosA + w1 * sinA;
          const zr = w1 * cosA - pt.u * sinA;
          if ((pass === 0) !== (zr < 0)) continue;
          // Facing factor: points rotated to the far side fade out.
          const facing = Math.min(1, Math.max(0, (zr + 1.05) / 2.1));
          // Pointer rim light: points whose relief normal faces the pointer
          // catch the light. The alpha lift alone barely reads — the point
          // cloud saturates from overlapping glyph draws — so the real
          // mechanism is the ramp shift: the lit side draws DENSER
          // characters (character density encodes brightness in ASCII
          // relief). Shaped so only the clearly-lit side lifts, capped so
          // it never reads as a hot spot. Skipped entirely at presence 0,
          // so the at-rest render is byte-identical to the unlit one.
          let alpha = 0.9 * (0.18 + 0.82 * facing);
          let lum = pt.lum;
          if (lightPresence > 0) {
            const rim = bustRimLight(lightU, lightV, xr, v1);
            const shaped = bustRimShaped(rim, lightPresence);
            alpha = Math.min(1, alpha * (1 + BUST_RIM_MAX * shaped));
            lum = Math.min(1, lum + BUST_RIM_LUM * shaped);
          }
          ctx.globalAlpha = alpha;
          const idx = Math.min(
            BUST_RAMP.length - 1,
            Math.floor(lum * BUST_RAMP.length),
          );
          ctx.fillText(BUST_RAMP[idx], half + xr * scale, half + v1 * scale);
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
      // Gaze: recompute the target from the last pointer position against
      // the current geometry — the box center tracks the dive sink via
      // scroll progress, so scrolling with a parked pointer stays correct —
      // then ease the head toward it (~1s settle, person-like, never a whip).
      // The same center also drives the rim-light direction and presence.
      const cy = window.innerHeight / 2 + DIVE_SINK_PX * getScrollProgress();
      let targetYaw = 0;
      let targetPitch = 0;
      let lightTarget = 0;
      if (lastPX !== null && lastPY !== null) {
        const { yaw, pitch } = gazeAngles(
          (lastPX - gazeCenterX) / gazeHalf,
          (lastPY - cy) / gazeHalf,
          GAZE_YAW,
          GAZE_PITCH,
        );
        targetYaw = yaw;
        targetPitch = pitch;
        // Rim light: pointer offset in the bust's own units (-1..1 ≈ box
        // half-extents), matching the point coordinates the rim term
        // evaluates against. Presence fades with distance — the light is
        // local, so a pointer across the screen doesn't spill onto the
        // portrait.
        const dx = lastPX - gazeCenterX;
        const dy = lastPY - cy;
        lightTarget = bustLightPresence(Math.hypot(dx, dy), gazeHalf);
        lightU = dx / (gazeHalf * 0.94);
        lightV = dy / (gazeHalf * 0.94);
      }
      gazeYaw = approachAngle(gazeYaw, targetYaw, dt);
      gazePitch = approachAngle(gazePitch, targetPitch, dt);
      lightPresence = approachAngle(lightPresence, lightTarget, dt);
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
    // Gaze input: the bust mounts only in animated desktop ASCII mode (it
    // never renders under reduced motion), so these listeners exist only
    // there. Pointer-leave / hidden tab → ease back to the scroll pose.
    const onPointerMove = (e: PointerEvent) => {
      lastPX = e.clientX;
      lastPY = e.clientY;
    };
    const onPointerGone = () => {
      lastPX = null;
      lastPY = null;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerGone);
    document.addEventListener("visibilitychange", onPointerGone);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener(
        "pointerleave",
        onPointerGone,
      );
      document.removeEventListener("visibilitychange", onPointerGone);
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
