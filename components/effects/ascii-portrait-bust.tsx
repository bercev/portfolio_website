"use client";

import { useEffect, useRef, useState } from "react";

import { approachAngle, bustGhostErase, bustLightPresence, bustRimLight, bustRimShaped, BUST_RIM_LUM, BUST_RIM_MAX, bustWipeDepth, BUST_WIPE_NOISE_K, fbm2, gazeAngles, glanceYawOffset, GLANCE_AMP_RAD, GLANCE_COOLDOWN_MS, GLANCE_DIR, GLANCE_IDLE_MS, objectGlanceDir, OBJECT_WINDOWS, objectWindowCrossed, objectWindowPos, scrollShared, scrollSnapshot, smoothstep01, subscribeScrollSnapshot, useScrollBlur, useScrollDive } from "@/lib/scroll-fx";

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
    // Previous composed rotation A (rad) — drives the phosphor-ghost
    // turn-velocity gate. null until the first draw (=> velocity 0).
    let prevA: number | null = null;

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

    // Attention glance (run-2 IDEA iter 16): on chapter activation with
    // an idle pointer, the head glances toward the new chapter's
    // headline — an additive yaw offset with a ~1.2s exponential decay,
    // so the glance is a transient directed-motion beat and rest is
    // provably byte-identical (the offset is exactly 0 beyond
    // GLANCE_CUTOFF_MS). The idle-pointer gate (no pointermove for
    // GLANCE_IDLE_MS) keeps it from fighting the pointer gaze: an
    // actively-moving pointer owns the head's attention, not the
    // chapter. Chapter resolution reuses the rail's rule (last
    // Attention glance state. The chapter comes from the shared scroll
    // snapshot publisher (run-2 iter 20) — the same 45%-line resolution
    // the glyph field's ping reads (the rail keeps its own deliberate
    // 35% line over the same published tops) — so the glance fires on
    // the exact same frame as the ping during a fast fling. Never fires
    // on the initial resolve (like the chapter-entry ping), and the bust
    // never mounts under reduced motion, so there is no RM branch to audit.
    let curChapter = -1; // resolved per draw tick; -1 = not yet resolved
    let glanceStart = Number.NEGATIVE_INFINITY; // wall-clock of the last fire
    let lastMoveT = Number.NEGATIVE_INFINITY; // last pointermove; -Inf = idle
    let glanceYaw = 0; // current additive offset, rad — exactly 0 at rest
    let glancePitch = 0; // object glances nod too (torus/cube sit below the bust)
    let glanceDirX = GLANCE_DIR; // unit-ish direction of the current glance
    let glanceDirY = 0;
    let lastGlanceFire = Number.NEGATIVE_INFINITY; // cooldown across both sources
    let prevObjT: number[] | null = null; // per-object window positions, last tick

    // One fire path for both glance sources (chapter + object): the
    // idle-pointer gate keeps the glance from fighting the pointer gaze,
    // and the shared cooldown keeps a fling that crosses a chapter line
    // and an object line in the same second to one beat, not two.
    const fireGlance = (now: number, dirX: number, dirY: number, objIndex = -1) => {
      if (now - lastMoveT < GLANCE_IDLE_MS) return;
      if (now - lastGlanceFire < GLANCE_COOLDOWN_MS) return;
      glanceStart = now;
      glanceDirX = dirX;
      glanceDirY = dirY;
      lastGlanceFire = now;
      // Object dialogue (run-2 IDEA iter 21, built iter 22): an OBJECT
      // glance publishes the answer signal — the glyph field reads
      // scrollShared on its own tick and the glanced-at tile spins up +
      // flashes its wireframe. Chapter glances have no object to answer,
      // so they publish nothing; the field owns expiry (nulls the signal
      // once the envelopes decay to exactly 0). `now` is the rAF
      // timestamp — same time origin as the field's tick, so the field's
      // dt math is valid across the two loops.
      if (objIndex >= 0) {
        scrollShared.objectAnswer = { obj: objIndex, t0: now };
      }
    };

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

    const draw = (dtTickS = 0) => {
      if (!cssSize || points.length === 0) return;
      const p = scrollSnapshot.progress;
      // Scroll turn + idle sway + pointer gaze + attention glance,
      // composed into one rotation. The glance is exactly 0 at rest, so
      // the settled render is byte-identical to the pre-glance one.
      const A =
        BUST_MAX_TURN * smoothstep01(p) +
        0.055 * Math.sin(timeS * 0.3) +
        gazeYaw +
        glanceYaw;
      const P = gazePitch + glancePitch;
      const cosA = Math.cos(A);
      const sinA = Math.sin(A);
      const cosP = Math.cos(P);
      const sinP = Math.sin(P);
      const half = cssSize / 2;
      const scale = half * 0.94;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Phosphor-persistence rotation ghosts (run-2 IDEA iter 17): gate
      // the per-tick fade on turn velocity — mid-rotation frames leave
      // decaying dithered ghosts, like a real CRT. At/below the deadband
      // (which the perpetual idle sway never exceeds) this is the exact
      // pre-change clearRect — the at-rest render is bit-identical by
      // construction. Otherwise a destination-out fill multiplies every
      // pixel's alpha by (1 - erase): the standard persistence recipe.
      const turnVel =
        prevA === null || dtTickS <= 0 ? 0 : Math.abs(A - prevA) / dtTickS;
      prevA = A;
      const erase = bustGhostErase(turnVel);
      if (erase <= 0) {
        ctx.clearRect(0, 0, cssSize, cssSize);
      } else {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(0,0,0,${erase})`;
        ctx.fillRect(0, 0, cssSize, cssSize);
        ctx.restore();
      }
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
      const cy = window.innerHeight / 2 + DIVE_SINK_PX * scrollSnapshot.progress;
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
      // Attention glance: one-shot offset from the last chapter OR
      // object crossing — decays to exactly 0 beyond GLANCE_CUTOFF_MS,
      // so the at-rest render is the identical code path as settled.
      // The 6° amplitude points along the fired direction: pure yaw for
      // chapter glances (content column, left), true azimuth (yaw + nod)
      // for object glances.
      const glanceMag = glanceYawOffset(now - glanceStart, GLANCE_AMP_RAD);
      glanceYaw = glanceMag * glanceDirX;
      glancePitch = glanceMag * glanceDirY;
      // Observability contract (same quantized pattern as the field's
      // data-ping-env): the live glance yaw/pitch in milliradians, so
      // probes gate on the component's own clock instead of wall-clock
      // time. Exactly "0" at rest.
      const gq = String(Math.round(glanceYaw * 1000));
      if (canvas.dataset.glance !== gq) canvas.dataset.glance = gq;
      const gpq = String(Math.round(glancePitch * 1000));
      if (canvas.dataset.glancePitch !== gpq)
        canvas.dataset.glancePitch = gpq;
      if (acc >= TICK_S) {
        // Chapter activation: the shared snapshot publisher (run-2
        // iter 20) resolves the chapter once per frame for every
        // consumer — the bust's glance and the field's ping read the
        // identical snapshot.chapterIndex, so they fire on the exact
        // same frame during a fast fling (the old per-tick resolve
        // could disagree by ~66ms, which the 1.2s decay used to
        // swallow). The rail keeps its own deliberate 35% line over
        // the same published tops (see line-sidebar). A real crossing
        // with an idle pointer fires the glance; the initial resolve
        // never does.
        const next = scrollSnapshot.chapterIndex;
        if (next !== curChapter) {
          const initial = curChapter < 0;
          curChapter = next;
          if (!initial) fireGlance(now, GLANCE_DIR, 0);
        }
        // Object attention (run-2 IDEA iter 19, built iter 21): when a 3D
        // object crosses its scroll-window's 50% line with an idle
        // pointer, the head glances toward the object's screen azimuth —
        // the same one-shot grammar as the chapter glance, sharing its
        // idle gate, cooldown, and decay contract. Positions resolve from
        // the shared snapshot (objectWindowPos is the field's windowT in
        // the lib), so no layout reads and no per-tick chapter-style
        // resolve. The initial resolve never fires.
        const pNow = scrollSnapshot.progress;
        const objT = OBJECT_WINDOWS.map((w) => objectWindowPos(pNow, w));
        if (prevObjT === null) {
          prevObjT = objT;
        } else {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          for (let i = 0; i < OBJECT_WINDOWS.length; i++) {
            if (objectWindowCrossed(prevObjT[i], objT[i])) {
              const w = OBJECT_WINDOWS[i];
              // Bust center in viewport fractions: gazeCenterX is cached
              // at resize; the vertical center tracks the dive sink, the
              // same cy the pointer gaze uses.
              const d = objectGlanceDir(
                w.mx,
                w.my,
                gazeCenterX / vw,
                (vh / 2 + DIVE_SINK_PX * pNow) / vh,
              );
              fireGlance(now, d.x, d.y, i);
              break; // one glance per tick — the cooldown orders the rest
            }
          }
          prevObjT = objT;
        }
        draw(acc);
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
    // Shared scroll snapshot (run-2 iter 20): this component mounts only
    // in animated desktop ASCII mode (never under reduced motion), so it
    // always subscribes — one scroll sample per frame for the turn, the
    // dive sink and the glance, identical to the field's and the rail's.
    const releaseSnapshot = subscribeScrollSnapshot();
    // Gaze input: the bust mounts only in animated desktop ASCII mode (it
    // never renders under reduced motion), so these listeners exist only
    // there. Pointer-leave / hidden tab → ease back to the scroll pose.
    const onPointerMove = (e: PointerEvent) => {
      lastPX = e.clientX;
      lastPY = e.clientY;
      lastMoveT = performance.now();
    };
    const onPointerGone = () => {
      lastPX = null;
      lastPY = null;
      // No pointer in the window = nothing to fight the glance.
      lastMoveT = Number.NEGATIVE_INFINITY;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerGone);
    document.addEventListener("visibilitychange", onPointerGone);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      releaseSnapshot();
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
