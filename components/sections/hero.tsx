"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { useMotionPreference } from "@/components/providers/motion-provider";
import type { PortfolioContent } from "@/data/content";
import { BUILD_LOGS } from "@/data/story";

type HeroContent = {
  readonly identity: PortfolioContent["identity"];
  readonly hero: PortfolioContent["hero"];
};

export function Hero({ content }: { content: HeroContent }) {
  const { identity, hero } = content;
  const { forced } = useMotionPreference();
  const osReduce = useReducedMotion();
  const reduceMotion = Boolean(forced) || osReduce;
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 48) setHasScrolled(true);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        transition={reduceMotion ? { duration: 0 } : { duration: 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
      >
        <h1 id="home-heading" aria-label={identity.name} className="sr-only">
          {identity.name}
        </h1>

        {/* Reserves the BERAT particle band so meta never sits over the glyph. */}
        <div data-hero-glyph-band aria-hidden="true">
          <div data-hero-name-fallback>{identity.shortName.toUpperCase()}</div>
        </div>

        {/* Role / location / tagline / scroll — always below the glyph band. */}
        <div data-hero-below>
          <div data-hero-lede>
            <div data-hero-meta>
              <span>1</span>
              <span data-hero-meta-sep>·</span>
              <span>{identity.role}</span>
              <span data-hero-meta-sep>·</span>
              <span>Santa Cruz, CA</span>
            </div>

            {hero.tagline ? <p data-hero-tagline>{hero.tagline}</p> : null}

            <p className="journey-build-log" aria-hidden="true">
              {BUILD_LOGS.home.map((line) => (
                <span key={line} className="journey-build-log-line">
                  <span className="journey-build-log-prompt">$</span> {line}
                </span>
              ))}
            </p>

            {!hasScrolled ? (
              <p className="journey-scroll-hint">Scroll to travel</p>
            ) : null}
          </div>

          <dl data-hero-signals>
            {hero.signals.map((signal) => (
              <div key={signal.label} data-hero-signal>
                <dt>{signal.label}</dt>
                <dd>{signal.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </motion.div>
    </section>
  )
}
