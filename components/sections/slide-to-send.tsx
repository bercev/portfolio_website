"use client";

import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

import {
  SLIDE_TO_SEND_EASE,
  SLIDE_TO_SEND_SHAKE,
  SLIDE_TO_SEND_SHAKE_MS,
  slideToSendHomeTransition,
  slideToSendKeyStepPx,
  slideToSendShouldCommit,
  slideToSendThumbWidth,
  slideToSendTravel,
  slideToSendVelocity,
} from "@/lib/slide-to-send";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type SlidePhase = "idle" | "pending" | "error";
type Grip = {
  id: number;
  grab: number | null;
  moved: boolean;
  hist: [number, number][];
};

type SlideToSendProps = {
  /** The form is sending (from any path) — locks the control. */
  readonly disabled: boolean;
  /** Validate + send; true = sent (the parent swaps to the receipt),
   * false = validation or send failed (the thumb shakes and springs home). */
  readonly onCommit: () => Promise<boolean>;
  readonly label?: string;
};

/**
 * Slide-to-send (run-10 RUN10-SLIDE-SEND): the contact form's luminous
 * submit pill becomes a slide-the-thumb track. The thumb drags a trail of
 * light behind it; release at the end — or a fast flick past 90% — sends.
 *
 * Mechanism after React Bits SlideCommit (read in full from the registry):
 * pointer-capture drag, velocity from the last few moves, spring home on
 * release short of the end, keyboard slider semantics, phases idle →
 * pending → error, spinner while the action runs, shake on failure.
 * Restyled to FROST (accent wash track, glowing thumb, light trail) and
 * rebuilt in our own stack — no library code copied, no new dependency.
 * See lib/slide-to-send.ts for the documented deviations (flick commit,
 * Enter/Space, fluid width, no done phase).
 */
export function SlideToSend({
  disabled,
  onCommit,
  label = "Slide to send",
}: SlideToSendProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<SlidePhase>("idle");
  const trackRef = useRef<HTMLDivElement>(null);
  const capsuleRef = useRef<HTMLDivElement>(null);
  const grip = useRef<Grip | null>(null);
  const live = useRef({
    move: (_e: { pointerId: number; clientX: number; timeStamp: number }) => {},
    up: (_e: { pointerId: number }) => {},
  });
  const unwatch = useRef<(() => void) | null>(null);
  const runRef = useRef(0);

  const x = useMotionValue(0);
  const travel = useMotionValue(0);
  const shakeX = useMotionValue(0);
  const thumbW = slideToSendThumbWidth();
  const fillWidth = useTransform([x, travel], ([v, _t]: number[]) => `${v + thumbW}px`);
  const labelOpacity = useTransform([x, travel], ([v, t]: number[]) =>
    t > 0 ? Math.min(1, Math.max(0, 1 - v / (0.55 * t))) : 1,
  );

  // Live aria-valuenow, the reference's pattern: the motion value writes
  // the attribute as the thumb moves, so a screen reader hears the %.
  useMotionValueEvent(x, "change", (v) => {
    const el = capsuleRef.current;
    if (!el) return;
    const t = travel.get();
    const percent = t > 0 ? Math.round((Math.min(Math.max(v, 0), t) / t) * 100) : 0;
    el.setAttribute("aria-valuenow", String(percent));
    el.setAttribute("aria-valuetext", `${label}, ${percent}%`);
  });

  function measure(): number {
    const rect = trackRef.current?.getBoundingClientRect();
    const t = rect ? slideToSendTravel(rect.width, thumbW) : 1;
    travel.set(t);
    return t;
  }

  // Keep travel fresh across resizes (the track is fluid, full form width).
  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      unwatch.current?.();
      runRef.current += 1;
    },
    [],
  );

  function goHome(velocity: number) {
    if (reduceMotion) {
      void animate(x, 0, slideToSendHomeTransition(true));
      return;
    }
    void animate(x, 0, {
      ...slideToSendHomeTransition(false),
      velocity: Math.min(0, velocity),
    });
  }

  async function commit() {
    if (phase !== "idle" || disabled) return;
    const id = ++runRef.current;
    const t = measure();
    setPhase("pending");
    if (reduceMotion) x.set(t);
    else void animate(x, t, slideToSendHomeTransition(false));
    let ok = false;
    try {
      ok = await onCommit();
    } catch {
      ok = false;
    }
    if (id !== runRef.current) return;
    if (ok) return; // Parent swaps the form to the receipt; stay parked.
    // Reject: shake the track, spring the thumb home, back to idle.
    setPhase("error");
    if (reduceMotion) {
      goHome(0);
      window.setTimeout(() => {
        if (id === runRef.current) setPhase("idle");
      }, SLIDE_TO_SEND_SHAKE_MS);
      return;
    }
    void animate(shakeX, SLIDE_TO_SEND_SHAKE, {
      duration: SLIDE_TO_SEND_SHAKE_MS / 1000,
      ease: SLIDE_TO_SEND_EASE,
    });
    window.setTimeout(() => {
      if (id === runRef.current) goHome(0);
    }, 300);
    window.setTimeout(() => {
      if (id === runRef.current) setPhase("idle");
    }, 700);
  }

  function local(clientX: number): number {
    // Track-local px: the travel model is in rendered px (the track is
    // fluid), so no scale factor — unlike the reference's fixed-width prop.
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return clientX - rect.left;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (disabled || phase !== "idle" || grip.current || e.button !== 0) return;
    x.stop();
    grip.current = { id: e.pointerId, grab: null, moved: false, hist: [] };
    try {
      trackRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is best-effort; the window listeners still fire.
    }
    unwatch.current?.();
    const onMove = (ev: PointerEvent) => {
      if (ev.isTrusted) live.current.move(ev);
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.isTrusted) live.current.up(ev);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    unwatch.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      unwatch.current = null;
    };
  }

  function onPointerMove(e: { pointerId: number; clientX: number; timeStamp: number }) {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    const at = local(e.clientX);
    if (g.grab === null) {
      // First move fixes the grab offset so the thumb never jumps to the
      // pointer (the reference's grab rule).
      g.grab = at - x.get();
      return;
    }
    const t = travel.get() || measure();
    const next = Math.min(Math.max(at - g.grab, 0), t);
    if (Math.abs(next - x.get()) > 0.5) g.moved = true;
    g.hist.push([e.timeStamp, next]);
    if (g.hist.length > 4) g.hist.shift();
    x.set(next);
  }

  function onPointerUp(e: { pointerId: number }) {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    grip.current = null;
    unwatch.current?.();
    try {
      trackRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // Best-effort, as above.
    }
    const t = travel.get() || measure();
    if (slideToSendShouldCommit(x.get(), t, slideToSendVelocity(g.hist))) {
      void commit();
    } else if (g.moved) {
      goHome(slideToSendVelocity(g.hist));
    }
  }
  live.current = { move: onPointerMove, up: onPointerUp };

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled || phase !== "idle") return;
    const t = travel.get() || measure();
    const step = slideToSendKeyStepPx(t);
    if (e.key === "End" || e.key === "Enter" || e.key === " ") {
      // End is the reference's commit key; Enter/Space are this control's
      // addition — a form submit control must answer the activation keys.
      e.preventDefault();
      void commit();
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(t, x.get() + step);
      x.set(next);
      if (next >= t) void commit();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      x.set(Math.max(0, x.get() - step));
    } else if (e.key === "Home" || e.key === "Escape") {
      e.preventDefault();
      if (grip.current) onPointerUp({ pointerId: grip.current.id });
      else x.set(0);
    }
  }

  // Working covers both commit paths: the slide's own pending phase, and a
  // form-level send started by the hidden submit button (Enter in a field).
  const working = phase === "pending" || disabled;

  return (
    <motion.div
      ref={(el) => {
        trackRef.current = el;
        capsuleRef.current = el;
      }}
      className="journey-contact-slide"
      data-slide-to-send
      data-slide-to-send-track
      data-phase={phase}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Slide to send your message"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      aria-valuetext={`${label}, 0%`}
      aria-disabled={disabled}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      style={{ x: shakeX }}
    >
      <motion.div
        className="journey-contact-slide-fill"
        data-slide-to-send-fill
        style={{ width: fillWidth }}
        aria-hidden="true"
      />
      <motion.span
        className="journey-contact-slide-label"
        data-slide-to-send-label
        style={{ opacity: labelOpacity }}
      >
        {working ? "Transmitting…" : label}
      </motion.span>
      <motion.div
        className="journey-contact-slide-thumb"
        data-slide-to-send-thumb
        style={{ x }}
        aria-hidden="true"
      >
        <span className="journey-contact-slide-arrow" aria-hidden="true">
          →
        </span>
        <span className="journey-contact-slide-spinner" aria-hidden="true" />
      </motion.div>
    </motion.div>
  );
}
