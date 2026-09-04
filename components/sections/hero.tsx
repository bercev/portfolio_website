"use client";

import { motion, useReducedMotion } from "motion/react";

import type { PortfolioContent } from "@/data/content";

type HeroContent = {
  readonly identity: PortfolioContent["identity"];
  readonly hero: PortfolioContent["hero"];
};

export function Hero({ content }: { content: HeroContent }) {
  const { identity, hero } = content;
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="home"
      aria-labelledby="home-heading"
      className="relative flex min-h-[100dvh] scroll-mt-[calc(4rem+env(safe-area-inset-top))] items-end"
    >
      <motion.div
        data-hero-editorial
        className="flex w-full flex-col pb-[16vh] pt-28"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.12 }
        }
      >
        <div data-hero-meta aria-hidden="true">
          <span>01</span>
          <span data-hero-meta-sep>·</span>
          <span>{identity.role}</span>
          <span data-hero-meta-sep>·</span>
          <span>Santa Cruz, CA</span>
        </div>

        <h1 id="home-heading" aria-label={identity.name} className="sr-only">
          {identity.name}
        </h1>

        {/* The journey canvas renders the name in 3D particles; this is the flat fallback. */}
        <div data-hero-name-fallback aria-hidden="true">
          {identity.shortName.toUpperCase()}
        </div>

        <div data-hero-sub>
          {hero.tagline ? <p data-hero-tagline>{hero.tagline}</p> : null}
          <span className="journey-scroll-hint">Scroll to fly the journey</span>
        </div>
      </motion.div>
    </section>
  );
}
