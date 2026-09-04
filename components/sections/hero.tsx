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
      className="relative flex min-h-[100dvh] scroll-mt-[calc(4rem+env(safe-area-inset-top))] flex-col"
    >
      <motion.div
        data-hero-editorial
        className="flex w-full flex-1 flex-col"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.12 }
        }
      >
        <h1 id="home-heading" aria-label={identity.name} className="sr-only">
          {identity.name}
        </h1>

        {/* Reserves the BERAT particle band so meta never sits over the glyph. */}
        <div data-hero-glyph-band aria-hidden="true">
          <div data-hero-name-fallback>
            {identity.shortName.toUpperCase()}
          </div>
        </div>

        {/* Role / location / tagline / scroll — always below the glyph band. */}
        <div data-hero-below>
          <div data-hero-meta>
            <span>01</span>
            <span data-hero-meta-sep>·</span>
            <span>{identity.role}</span>
            <span data-hero-meta-sep>·</span>
            <span>Santa Cruz, CA</span>
          </div>

          <div data-hero-sub>
            {hero.tagline ? <p data-hero-tagline>{hero.tagline}</p> : null}
            <span className="journey-scroll-hint">Scroll to fly the journey</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
