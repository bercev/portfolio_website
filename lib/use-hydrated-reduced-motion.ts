"use client";

import { useSyncExternalStore } from "react";

import { useMotionPreference } from "@/components/providers/motion-provider";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

function subscribe() {
  return () => undefined;
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/**
 * Reduced motion after hydration: the app-level forced flag (/plain) wins,
 * otherwise the live OS preference — read natively, not through motion's
 * `useReducedMotion()`, which freezes its first-render value (run-9 iter 1:
 * SSR-rendered consumers kept the motion branch under reduced motion).
 * The `hydrated` gate keeps the SSR/first-paint value false so no
 * hydration mismatch is introduced by the post-mount flip.
 */
export function useHydratedReducedMotion() {
  const { forced } = useMotionPreference();
  const reducedMotion = usePrefersReducedMotion();
  const hydrated = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (forced) return true;
  return hydrated && reducedMotion === true;
}
