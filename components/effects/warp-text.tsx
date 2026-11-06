"use client";

import { Fragment } from "react";
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
  // Split into words so a multi-word heading (e.g. "Let's connect") can
  // still wrap between words on narrow screens — each word is one
  // unbreakable unit, and the stagger index runs across the whole heading.
  // The space between words is a plain text node in the inline context, so
  // it collapses at a line break exactly like plain-text spacing.
  const words = text.split(" ");
  let index = 0;

  return (
    <Component
      data-warp-replay={reducedMotion ? "static" : "true"}
      className={cn("relative inline-block", className)}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, wordIndex) => (
          <Fragment key={`${word}-${wordIndex}`}>
            <span className="inline-block whitespace-pre">
              {[...word].map((character) => {
                const glyphIndex = index;
                index += 1;
                return (
                  <motion.span
                    key={`${character}-${glyphIndex}`}
                    data-warp-glyph
                    className="inline-block whitespace-pre"
                    initial={reducedMotion ? false : { y: 10 }}
                    animate={reducedMotion ? { y: 0 } : undefined}
                    whileInView={reducedMotion ? undefined : { y: 0 }}
                    viewport={{ once: true, amount: 0.72 }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.45,
                      delay: reducedMotion ? 0 : Math.min(glyphIndex * 0.03, 0.36),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {character}
                  </motion.span>
                );
              })}
            </span>
            {wordIndex < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
    </Component>
  );
}
