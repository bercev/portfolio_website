"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { useMotionPreference } from "@/components/providers/motion-provider";

export function useHydratedReducedMotion() {
  const { forced } = useMotionPreference();
  const reducedMotion = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (forced) return true;
  return hydrated && reducedMotion === true;
}
