"use client";

import { motion } from "motion/react";

import { useHydratedReducedMotion } from "@/lib/use-hydrated-reduced-motion";
import { cn } from "@/lib/utils";

const GLYPHS: Record<string, readonly string[]> = {
  A: [" ███ ", "█   █", "█████", "█   █", "█   █"],
  B: ["████ ", "█   █", "████ ", "█   █", "████ "],
  E: ["█████", "█    ", "████ ", "█    ", "█████"],
  R: ["████ ", "█   █", "████ ", "█ █  ", "█   █"],
  T: ["█████", "  █  ", "  █  ", "  █  ", "  █  "],
};

function renderAscii(text: string) {
  const glyphs = [...text.toUpperCase()].map(
    (character) =>
      GLYPHS[character] ?? [
        character,
        character,
        character,
        character,
        character,
      ],
  );

  return Array.from({ length: 5 }, (_, row) =>
    glyphs.map((glyph) => glyph[row]).join("  "),
  ).join("\n");
}

export function AsciiText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const reducedMotion = useHydratedReducedMotion();

  return (
    <span className={cn("relative inline-block", className)} data-ascii-text>
      <span className="sr-only">{text}</span>
      <motion.pre
        aria-hidden="true"
        className="overflow-visible select-none font-mono text-[clamp(1rem,6.5vw,4.5rem)] font-bold leading-[0.92] tracking-[-0.05em] text-foreground"
        initial={reducedMotion ? false : { opacity: 0, scale: 0.98, y: 12 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {renderAscii(text)}
      </motion.pre>
    </span>
  );
}
