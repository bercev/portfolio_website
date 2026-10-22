"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimate, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Pre-built component from Aceternity UI (https://ui.aceternity.com/components/stateful-button),
 * ported with the animation MECHANISM verbatim — the useAnimate ".loader"/".check" width/scale/
 * display sequences with 0.2s timings (class names namespaced to this component so the scoped
 * selectors can't collide with anything else on the page).
 *
 * Adapted, not copied, in two ways:
 * 1. The registry demo is click-driven and assumes onClick success (loading -> onClick -> check).
 *    Here the parent drives an ASYNC SUBMIT with error paths, so the click driver is replaced
 *    with a controlled `state` prop. Success is conveyed by the form's intentional receipt panel
 *    (the site's established success state), so the button only ever shows idle / sending /
 *    error-reset; the upstream success animation exists for API completeness but the form swaps
 *    to its receipt on success instead of holding a check on the button.
 * 2. The demo's rounded-full monochrome chrome is replaced by the site's terminal brand
 *    (square corners, FROST accent button) — mechanism unchanged, demo chrome stripped, per the
 *    taste skill.
 *
 * Reduced motion: the 0.2s grow/shrink runs at duration 0 (instant state swap) and the spinner
 * itself is `motion-reduce:animate-none`. The loader animates width/scale (upstream mechanism
 * on a 20px icon); the "transform/opacity only" rule targets layout-affecting UI transitions,
 * not this icon.
 *
 * Tailwind v4 note: the upstream uses `scale-0` to hide the icons, but Tailwind v4 implements
 * scale utilities via the INDIVIDUAL `scale` property, which the `animate-spin` keyframes
 * (transform-only) do not override — the loader would stay invisible forever. The icons below
 * use an explicit inline `transform: scale(0)` instead, restoring the upstream Tailwind-v3
 * semantics the mechanism was designed against (spin's transform overrides it when showing).
 *
 * `motion` was already a dependency (no new package installed — security gate N/A).
 */
export type StatefulSubmitState = "idle" | "sending" | "error";

type StatefulSubmitButtonProps = {
  readonly state: StatefulSubmitState;
  readonly className?: string;
  readonly children: React.ReactNode;
} & Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  | "className"
  | "children"
  | "onClick"
  | "type"
  // motion.button retypes these drag/animation handlers; strip the React
  // versions so the spread below typechecks (upstream does the same via
  // destructure).
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
>;

export function StatefulSubmitButton({
  state,
  className,
  children,
  disabled,
  ...buttonProps
}: StatefulSubmitButtonProps) {
  const [scope, animate] = useAnimate();
  const shouldReduceMotion = useReducedMotion();
  const prevStateRef = useRef<StatefulSubmitState>(state);

  useEffect(() => {
    const previous = prevStateRef.current;
    prevStateRef.current = state;
    if (previous === state) return;

    // Upstream runs its sequences at 0.2s; under reduced motion the state
    // swap is instant instead of animated.
    const duration = shouldReduceMotion ? 0 : 0.2;

    if (state === "sending") {
      // Upstream animateLoading(): the spinner grows in and starts spinning.
      void animate(
        ".stateful-submit-loader",
        { width: "20px", scale: 1, display: "block" },
        { duration },
      );
      return;
    }

    // idle / error: reset — hide the spinner (upstream animateSuccess() shrinks
    // it the same way). The form's inline message carries the error state, so
    // the button itself just returns to its resting label.
    void animate(
      ".stateful-submit-loader",
      { width: "0px", scale: 0, display: "none" },
      { duration },
    );
    void animate(
      ".stateful-submit-check",
      { width: "0px", scale: 0, display: "none" },
      { duration },
    );
  }, [state, animate, shouldReduceMotion]);

  return (
    <motion.button
      ref={scope}
      type="submit"
      disabled={disabled || state === "sending"}
      className={cn(className)}
      {...buttonProps}
    >
      <motion.span className="inline-flex items-center gap-2">
        <motion.span
          aria-hidden="true"
          style={{ transform: "scale(0)" }}
          className="stateful-submit-loader motion-reduce:animate-none hidden h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
        <motion.svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          style={{ transform: "scale(0)" }}
          className="stateful-submit-check hidden h-4 w-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
        >
          <motion.path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
        <span>{children}</span>
      </motion.span>
    </motion.button>
  );
}
