/**
 * Pluckable 404 heading (run-10 RUN10-PLUCK).
 *
 * The "lost" heading sits on a light string you can pluck and let
 * ring — Kokonut UI's PluckedText (v1.0.0, MIT, read in full
 * 2026-11-12), rebuilt in our own stack and restyled to FROST: the
 * string is an accent-neon light line with a glow ghost (the
 * previous frame stays behind faintly, so a vibrating string blurs),
 * pinned at both ends by glow dots, and the letters ride the string
 * — they translate + tilt with its slope. No new dependency; the
 * physics lives in lib/plucked-string.ts.
 *
 * Interaction: drag the string (pointer capture, the pull stiffens
 * the further it goes), release to ring; sweep the cursor across
 * the line to strum it (mouse only). A soft greeting strum plays
 * the first time the heading scrolls into view, so the string shows
 * it can move without waiting for a pointer. Reduced motion: no
 * greeting, no strum, and a release eases back flat over 260ms
 * instead of ringing (the reference's ease-back) — the page is
 * static unless the user pulls the string.
 *
 * The heading stays a real h1: screen readers get the plain text
 * once (sr-only), the letter spans are aria-hidden decoration.
 * The letters row is one line at both widths (desktop text 319px
 * in a 362px column; mobile 248px in a 318px content box —
 * measured on the before build), and the row is `white-space: pre`
 * so the spaces between words keep their width inside the
 * inline-block letter spans.
 *
 * Probes for verification: `data-pluck-state` ("rest" | "grab" |
 * "ring") and `data-pluck-peak` (the string's peak |displacement|
 * in px this frame) on the stage.
 */
"use client";

import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import {
  PLUCK_GREET_APEX_FRACTION,
  PLUCK_GREET_SWAY_FRACTION,
  PLUCK_MAX_STRUM_SPEED,
  PLUCK_REST_ENERGY,
  PLUCK_RM_EASE_BACK_MS,
  PLUCK_STEP_PX,
  PLUCK_STRUM_GAIN,
  PLUCK_TENSION,
  PLUCK_TILT,
  pluckCreateModes,
  pluckEnergy,
  pluckSettle,
  pluckSoften,
  pluckStepMode,
  pluckSumAt,
  pluckSwingPx,
  pluckTriangleModes,
  type PluckMode,
} from "@/lib/plucked-string";

/** The heading text — verbatim, same as before. */
export const NOT_FOUND_PLUCK_TEXT = "404 — Not found";

/** The string's tension (1 = the reference default). */
export const NOT_FOUND_PLUCK_TENSION = PLUCK_TENSION;

export function NotFoundPluck() {
  const stageRef = useRef<HTMLSpanElement>(null);
  const lettersRef = useRef<HTMLSpanElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const ghostRef = useRef<SVGPathElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const stage = stageRef.current;
    const lettersEl = lettersRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    const ghost = ghostRef.current;
    if (!(stage && lettersEl && svg && path && ghost)) return;

    const letters = Array.from(lettersEl.children).slice(
      0,
      -1,
    ) as HTMLElement[];

    let length = 0;
    let swing = 0;
    let modes: PluckMode[] = [];
    let pathBasis: Float64Array[] = [];
    let letterBasis: { sin: Float64Array; cos: Float64Array }[] = [];
    let raf = 0;
    let last = 0;
    let visible = true;
    let lastPath = "";
    let grab: { id: number; x: number; y: number } | null = null;
    let release: { from: Float64Array; start: number } | null = null;
    let prev: { x: number; y: number; t: number } | null = null;

    const setState = (state: "rest" | "grab" | "ring") => {
      stage.dataset.pluckState = state;
    };

    const measure = () => {
      // The string sits on the text's baseline, found with an empty
      // inline-block, whose bottom edge rests on it.
      const probe = lettersEl.lastElementChild as HTMLElement;
      stage.style.setProperty(
        "--pluck-baseline",
        `${lettersEl.offsetTop + probe.offsetTop + probe.offsetHeight}px`,
      );
      const svgBox = svg.getBoundingClientRect();
      const lettersLeft = lettersEl.getBoundingClientRect().left - svgBox.left;
      length = svgBox.width;
      swing = pluckSwingPx(
        Number.parseFloat(getComputedStyle(stage).fontSize),
      );
      const old = modes;
      modes = pluckCreateModes(length, NOT_FOUND_PLUCK_TENSION, old);
      const samples = Math.ceil(length / PLUCK_STEP_PX) + 1;
      pathBasis = Array.from({ length: samples }, (_, i) => {
        const x = Math.min(i * PLUCK_STEP_PX, length);
        return Float64Array.from(modes, (_m, index) =>
          Math.sin(((index + 1) * Math.PI * x) / length),
        );
      });
      letterBasis = letters.map((letter) => {
        const x = lettersLeft + letter.offsetLeft + letter.offsetWidth / 2;
        const k = (index: number) => ((index + 1) * Math.PI) / length;
        return {
          sin: Float64Array.from(modes, (_m, index) =>
            Math.sin(k(index) * x),
          ),
          cos: Float64Array.from(
            modes,
            (_m, index) => k(index) * Math.cos(k(index) * x),
          ),
        };
      });
    };

    const draw = () => {
      let d = "";
      let peak = 0;
      for (let i = 0; i < pathBasis.length; i++) {
        const x = Math.min(i * PLUCK_STEP_PX, length);
        const y = pluckSoften(pluckSumAt(modes, pathBasis[i]), swing);
        peak = Math.max(peak, Math.abs(y));
        d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(2)}`;
      }
      // The previous frame stays behind faintly: a vibrating string blurs.
      ghost.setAttribute("d", lastPath || d);
      path.setAttribute("d", d);
      lastPath = d;
      stage.dataset.pluckPeak = peak.toFixed(1);
      setState(grab ? "grab" : peak > 0.05 ? "ring" : "rest");
      for (let i = 0; i < letters.length; i++) {
        const { sin, cos } = letterBasis[i];
        const raw = pluckSumAt(modes, sin);
        const y = pluckSoften(raw, swing);
        // Slope of the softened curve, so tilt eases off with the swing.
        const t = Math.tanh(raw / swing);
        const slope = pluckSumAt(modes, cos) * (1 - t * t);
        const angle = Math.atan(slope) * PLUCK_TILT;
        letters[i].style.transform =
          `translate3d(0, ${y.toFixed(2)}px, 0) rotate(${angle.toFixed(4)}rad)`;
      }
    };

    /** Reduced motion: no ringing, the line just eases back flat. */
    const easeBack = (now: number) => {
      if (!release) return;
      const t = Math.min((now - release.start) / PLUCK_RM_EASE_BACK_MS, 1);
      const left = (1 - t) ** 3;
      const from = release.from;
      modes.forEach((mode, index) => {
        mode.q = from[index] * left;
      });
      if (t >= 1) {
        release = null;
        pluckSettle(modes);
      }
    };

    const advance = (now: number, dt: number) => {
      if (release) {
        easeBack(now);
      } else if (!grab) {
        for (const mode of modes) {
          pluckStepMode(mode, dt);
        }
      }
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      advance(now, dt);
      draw();
      if (grab || release || pluckEnergy(modes) > PLUCK_REST_ENERGY) {
        raf = requestAnimationFrame(frame);
        return;
      }
      pluckSettle(modes);
      draw();
      ghost.setAttribute("d", path.getAttribute("d") ?? "");
    };

    const start = () => {
      if (!raf && visible) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    /** Pointer position along the string and above or below it. */
    const local = (event: PointerEvent) => {
      const r = svg.getBoundingClientRect();
      return { x: event.clientX - r.left, y: event.clientY - r.top };
    };

    const lineAt = (x: number) => {
      let y = 0;
      for (let i = 0; i < modes.length; i++) {
        y += modes[i].q * Math.sin(((i + 1) * Math.PI * x) / length);
      }
      return pluckSoften(y, swing);
    };

    const onDown = (event: PointerEvent) => {
      if (grab || event.button !== 0) return;
      const point = local(event);
      if (point.x < 0 || point.x > length) return;
      event.preventDefault();
      stage.setPointerCapture(event.pointerId);
      release = null;
      grab = { id: event.pointerId, x: point.x, y: point.y };
      stage.dataset.grabbing = "";
      pluckTriangleModes(modes, length, point.x, lineAt(point.x));
      start();
    };

    const onMove = (event: PointerEvent) => {
      const point = local(event);
      if (grab && event.pointerId === grab.id) {
        // Follow the hand along the string, and up or down with a
        // pull that stiffens the further it goes.
        grab.x = Math.min(Math.max(point.x, 0), length);
        grab.y = pluckSoften(point.y, swing * 1.6);
        pluckTriangleModes(modes, length, grab.x, grab.y);
        start();
        return;
      }
      if (!(event.pointerType === "mouse") || reduceMotion) {
        prev = null;
        return;
      }
      const now = event.timeStamp;
      if (prev && point.x >= 0 && point.x <= length) {
        // Did the cursor cross the line since the last move? Then it
        // strums it there, as hard as it was moving.
        const before = prev.y - lineAt(prev.x);
        const after = point.y - lineAt(point.x);
        if (before * after < 0) {
          const dt = Math.max(now - prev.t, 8) / 1000;
          const speed = Math.max(
            -PLUCK_MAX_STRUM_SPEED,
            Math.min(
              PLUCK_MAX_STRUM_SPEED,
              (point.y - prev.y) / dt,
            ),
          );
          const where =
            prev.x + (point.x - prev.x) * (before / (before - after));
          modes.forEach((mode, index) => {
            const n = index + 1;
            mode.v +=
              ((PLUCK_STRUM_GAIN * speed * 80) / length) *
              Math.sin((n * Math.PI * where) / length) *
              Math.exp(-((n / 14) ** 2));
          });
          start();
        }
      }
      prev = { x: point.x, y: point.y, t: now };
    };

    const onUp = (event: PointerEvent) => {
      if (!grab || event.pointerId !== grab.id) return;
      grab = null;
      delete stage.dataset.grabbing;
      if (reduceMotion) {
        release = {
          from: Float64Array.from(modes, (mode) => mode.q),
          start: performance.now(),
        };
      }
      start();
    };

    const onLeave = () => {
      prev = null;
    };

    measure();
    draw();

    const resizeObserver = new ResizeObserver(() => {
      measure();
      draw();
    });
    resizeObserver.observe(stage);

    // Letter widths change when a web font arrives.
    document.fonts?.ready.then(() => {
      measure();
      draw();
    });

    // One soft strum the first time the line scrolls into view, so
    // it shows it can move. Reduced motion skips the greeting.
    let greeted = reduceMotion;
    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible =
          entry.isIntersecting && document.visibilityState === "visible";
        if (!visible) return;
        if (!greeted && entry.intersectionRatio > 0.6) {
          greeted = true;
          pluckTriangleModes(
            modes,
            length,
            length * PLUCK_GREET_APEX_FRACTION,
            -swing * PLUCK_GREET_SWAY_FRACTION,
          );
        }
        start();
      },
      { threshold: [0, 0.6] },
    );
    intersection.observe(stage);

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      if (visible) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    stage.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, [reduceMotion]);

  return (
    <h1 className="not-found-status not-found-pluck">
      <span className="sr-only">{NOT_FOUND_PLUCK_TEXT}</span>
      <span
        className="not-found-pluck-stage"
        ref={stageRef}
        data-pluck-state="rest"
        data-pluck-peak="0"
      >
        <span
          aria-hidden="true"
          className="not-found-pluck-letters"
          ref={lettersRef}
        >
          {Array.from(NOT_FOUND_PLUCK_TEXT).map((char, index) => (
            <span
              className="not-found-pluck-letter"
              // Letters repeat; their position is their identity.
              key={index}
            >
              {char}
            </span>
          ))}
          <span className="not-found-pluck-probe" />
        </span>
        {/* The string runs along the baseline, pinned at both ends. */}
        <svg
          aria-hidden="true"
          className="not-found-pluck-string"
          ref={svgRef}
          style={{ top: "var(--pluck-baseline, 1.56em)" }}
        >
          <path
            className="not-found-pluck-ghost"
            fill="none"
            ref={ghostRef}
            strokeLinecap="round"
          />
          <path
            className="not-found-pluck-path"
            fill="none"
            ref={pathRef}
            strokeLinecap="round"
          />
        </svg>
        <span
          aria-hidden="true"
          className="not-found-pluck-dot not-found-pluck-dot-left"
          style={{ top: "var(--pluck-baseline, 1.56em)" }}
        />
        <span
          aria-hidden="true"
          className="not-found-pluck-dot not-found-pluck-dot-right"
          style={{ top: "var(--pluck-baseline, 1.56em)" }}
        />
      </span>
    </h1>
  );
}
