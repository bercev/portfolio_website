"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export function TraitRotator({ traits }: { traits: readonly string[] }) {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion || traits.length < 2) return;

    let interval = 0;
    const stop = () => window.clearInterval(interval);
    const start = () => {
      stop();
      if (document.visibilityState !== "visible") return;
      interval = window.setInterval(() => {
        setIndex((current) => (current + 1) % traits.length);
      }, 2400);
    };
    const handleVisibility = () => start();

    start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [reducedMotion, traits.length]);

  const trait = traits[reducedMotion ? 0 : index] ?? "";

  return (
    <span className="relative inline-grid min-w-[13ch]" aria-live="polite">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={trait}
          className="col-start-1 row-start-1"
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {trait}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
