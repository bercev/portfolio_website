"use client";

import { motion, useReducedMotion } from "motion/react";

import ASCIIText from "@/components/effects/react-bits-ascii-text";
import { useMotionPreference } from "@/components/providers/motion-provider";
import type { PortfolioContent } from "@/data/content";

type HeroContent = {
  readonly identity: PortfolioContent["identity"];
  readonly hero: PortfolioContent["hero"];
};

export function Hero({ content }: { content: HeroContent }) {
  const { identity, hero } = content;
  const { forced } = useMotionPreference();
  const osReduce = useReducedMotion();
  const reduceMotion = Boolean(forced) || osReduce;

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

        {/* BERAT as React Bits ASCIIText (MIT) — real canvas-sampled ASCII art. */}
        <div data-hero-glyph-band aria-hidden="true">
          <ASCIIText
            text="BERAT"
            asciiFontSize={5}
            fontFamily="'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
            fontWeight={700}
            textColor="#ffffff"
            colors={["#ffffff", "#00e5ff", "#0090ff"]}
            textScale={1.9}
            letterSpacing={0.07}
            blocks={0}
            waves={0.2}
            waveSpeed={0.4}
            chroma={0.2}
            tilt={1}
            hueShift={0}
            scramble={0.6}
            clickRipple
            intro
            idle
            interactive
            theme="dark"
            style={{ pointerEvents: "auto" }}
          />
        </div>

        {/* Role / location / tagline / scroll — always below the glyph band. */}
        <div data-hero-below>
          <div data-hero-lede>
            <div data-hero-meta>
              <span>{identity.role} based in Santa Cruz, California.</span>
            </div>

            {hero.tagline ? <p data-hero-tagline>{hero.tagline}</p> : null}
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
