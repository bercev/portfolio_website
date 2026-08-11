"use client";

import { motion, useScroll, useSpring } from "motion/react";

import { useHydratedReducedMotion } from "@/lib/use-hydrated-reduced-motion";

export function ScrollProgress() {
  const reducedMotion = useHydratedReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.3,
  });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-y-0 right-0 z-[var(--z-site-navigation)] w-0.5 bg-border/60"
    >
      {reducedMotion ? null : (
        <motion.div
          className="h-full w-full bg-portfolio-accent"
          style={{ scaleY, transformOrigin: "top" }}
        />
      )}
    </div>
  );
}
