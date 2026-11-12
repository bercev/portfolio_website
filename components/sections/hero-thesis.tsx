"use client";

import { Fragment } from "react";
import { motion } from "motion/react";

import {
  THESIS_BASE_DELAY_S,
  THESIS_EASE,
  THESIS_WORD_DURATION_S,
  thesisWordDelay,
  thesisWords,
} from "@/lib/hero-thesis";

export {
  THESIS_BASE_DELAY_S,
  THESIS_EASE,
  THESIS_WORD_DURATION_S,
  thesisWordDelay,
  thesisWords,
} from "@/lib/hero-thesis";

/**
 * RUN10-THESIS — the research thesis line in the hero (Gleb Kuznetsov
 * move, CS-portfolio note): one sentence stating Berat's research point
 * of view, built only from his actual paper topics (human–LLM interaction
 * in the wild / public AI conversations from @GrokSet, agents getting
 * better at skills from SkillOptimizer). Copy lives in content.ts.
 *
 * Light/flow language, not a plate: a single sentence in the lede's own
 * type, led by a small glowing dot (the ribbon's light, distilled — the
 * same marker the signals rows and flow numbers use), revealed word by
 * word with the site's ease-out (Componentry Kinetic Text Reveal as
 * direction reference, rebuilt in our own stack). Reduced motion renders
 * the full sentence statically — no stagger, no animation. Screen
 * readers read the sentence normally: the words are plain spans in a
 * paragraph, never aria-hidden.
 */
export function HeroThesis({
  thesis,
  reduceMotion,
}: {
  readonly thesis: string;
  readonly reduceMotion: boolean;
}) {
  const words = thesisWords(thesis);

  return (
    <p data-hero-thesis>
      <span data-hero-thesis-dot aria-hidden="true" />
      <span>
        {words.map((word, i) => (
          <Fragment key={`${word}-${i}`}>
            {reduceMotion ? (
              <span data-hero-thesis-word>{word}</span>
            ) : (
              <motion.span
                data-hero-thesis-word
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: THESIS_WORD_DURATION_S,
                  ease: [...THESIS_EASE],
                  delay: thesisWordDelay(i),
                }}
              >
                {word}
              </motion.span>
            )}
            {/* The word gap is a text node BETWEEN the inline-block
                words: a trailing space inside the span collapses at the
                inline-block edge and the words run together (caught in
                the fix frames — the sentence rendered spaceless). */}
            {i < words.length - 1 ? " " : ""}
          </Fragment>
        ))}
      </span>
    </p>
  );
}
