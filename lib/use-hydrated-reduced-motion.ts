"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export function useHydratedReducedMotion() {
  const reducedMotion = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated && reducedMotion === true;
}
