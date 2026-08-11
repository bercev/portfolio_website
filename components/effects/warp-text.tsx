"use client";

import { motion } from "motion/react";

import { useHydratedReducedMotion } from "@/lib/use-hydrated-reduced-motion";
import { cn } from "@/lib/utils";

export function WarpText({
  text,
  as: Component = "span",
  className,
}: {
  text: string;
  as?: "span" | "div";
  className?: string;
}) {
  const reducedMotion = useHydratedReducedMotion();

  return (
    <Component className={cn("relative inline-block", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline-flex">
        {[...text].map((character, index) => (
          <motion.span
            key={`${character}-${index}`}
            className="inline-block whitespace-pre"
            initial={reducedMotion ? false : { opacity: 0, y: 12, rotate: 2 }}
            animate={
              reducedMotion ? { opacity: 1, y: 0, rotate: 0 } : undefined
            }
            whileInView={
              reducedMotion ? undefined : { opacity: 1, y: 0, rotate: 0 }
            }
            viewport={{ once: true, amount: 0.75 }}
            transition={{
              duration: reducedMotion ? 0 : 0.45,
              delay: reducedMotion ? 0 : Math.min(index * 0.025, 0.28),
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {character}
          </motion.span>
        ))}
      </span>
    </Component>
  );
}
