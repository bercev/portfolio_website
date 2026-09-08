"use client";

import { useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";

import { useMotionPreference } from "@/components/providers/motion-provider";

function subscribe() {
  return () => undefined;
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function useHydratedReducedMotion() {
  const { forced } = useMotionPreference();
  const reducedMotion = useReducedMotion();
  const hydrated = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (forced) return true;
  return hydrated && reducedMotion === true;
}
