"use client";

import { useSyncExternalStore } from "react";

import { REDUCED_MOTION_QUERY } from "./effect-policy";

/**
 * The OS reduced-motion preference, read natively.
 *
 * Why not motion's `useReducedMotion()` (motion/react)? That hook freezes
 * the value from its first render (`useState(prefersReducedMotion.current)`
 * with no subscription) — and in this app, under a `reducedMotion: "reduce"`
 * browser context, the hero's first render still sees the motion branch
 * (verified 2026-11-08, run-9 iter 1: `matchMedia` true, effect profile
 * "static", warp-text's `useHydratedReducedMotion` true — yet the hero's
 * raw hook yielded the motion branch on every mount, including after
 * client-side nav). `useSyncExternalStore` reads the live media query on
 * every render and subscribes to changes, so the branch is always correct
 * — and it matches how EffectStage already detects reduced motion.
 */
function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getClientSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
