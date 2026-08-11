"use client";

import { useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function useHydratedReducedMotion() {
  const reducedMotion = useReducedMotion();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);

  return hydrated && reducedMotion === true;
}
