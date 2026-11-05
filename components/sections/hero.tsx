"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";

import ASCIIText from "@/components/effects/react-bits-ascii-text";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { MagneticButton } from "@/components/ui/magnetic-button";
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
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  // Light-mode BERAT colors (run-7 iter 8, round-3 fix): in light mode
  // the page is near-white and the shader's brightness boost pushes any
  // bright tint to near-white, so the white/cyan gradient vanishes —
  // the R and A read as pure white glyphs on a near-white page. The
  // component's built-in light theme is NOT the fix: its inversion
  // turns the cyan palette red. So the theme prop stays "dark" (no
  // inversion) and light mode gets dark-navy colors that survive the
  // boost and read as the deep end of the cyan family on white.
  // ROUND-4 FIX (this fire): the navy set is gated on the EFFECTIVE
  // background, not the theme alone. Under real motion the light
  // ribbons claim data-ascii="active" and the FROST remap forces the
  // page dark even when the theme is light — the round-3 set rendered
  // dark navy on dark and BERAT vanished (v7iter8 light-motion hero).
  // The page is genuinely light only when the theme is light AND
  // motion is reduced (no data-ascii claim, no remap), so the navy
  // set applies only then; every other mode keeps the bright cyan.
  // ROUND-5 ATTEMPT (this fire) REVERTED: near-black navy
  // ["#000000", "#000408", "#000a12"] moved glyph cores only 139→125
  // luminance (ratio 1.77→1.97) and read as neutral mid-grey, not navy
  // — the shader's glyph-alpha blend over white is the limiter, and
  // the near-black set loses the cyan identity for a hair of darkness.
  // A fresh mini-critic judged it "about the same for legibility" and
  // voted REVERT. The round-4 slate-blue set stays: all five letters
  // readable, faint blue identity kept. A real fix needs a shader-level
  // glyph-alpha change in the shared ASCIIText component — out of
  // run-7's background-only scope; filed as RUN7-LIGHT-BERAT-SOFT.
  const lightBerat = isLight && reduceMotion;

  return (
    <section
      id="home"
      data-light-chapter="home"
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
            colors={
              lightBerat
                ? ["#000d17", "#001320", "#001a2b"]
                : ["#ffffff", "#00e5ff", "#0090ff"]
            }
            textScale={2.3}
            letterSpacing={0.07}
            blocks={0}
            waves={0}
            waveSpeed={0}
            chroma={0}
            tilt={1}
            hueShift={0}
            scramble={0}
            intro
            idle={false}
            interactive
            theme="dark"
            style={{ pointerEvents: "auto" }}
          />
        </div>

        {/* Role / location / tagline / scroll — always below the glyph band. */}
        <div data-hero-below>
          <div data-hero-lede>
            <div data-hero-meta>
              <span>Based in Santa Cruz, California.</span>
            </div>

            {hero.tagline ? <p data-hero-tagline>{hero.tagline}</p> : null}

            {/* One calm call to action: subtle magnetic drift + spring return (Aceternity
                MagneticButton), held still under reduced motion. */}
            <MagneticButton strength={reduceMotion ? 0 : 0.22} maxDistance={36}>
              <a href="#projects" className="cursor-target" data-hero-cta>
                See my work <span aria-hidden="true">↓</span>
              </a>
            </MagneticButton>
          </div>

          <dl data-hero-signals>
            {hero.signals.map((signal) => (
              <div key={signal.label} data-hero-signal>
                <dt>{signal.label}</dt>
                <dd>
                  {signal.href ? (
                    <a href={signal.href} data-hero-signal-link>
                      {signal.value}
                    </a>
                  ) : (
                    signal.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </motion.div>
    </section>
  )
}
