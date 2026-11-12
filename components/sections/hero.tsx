"use client";

import { motion } from "motion/react";
import { useTheme } from "next-themes";

import ASCIIText from "@/components/effects/react-bits-ascii-text";
import { ParticleBerat } from "@/components/effects/particle-berat";
import { HeroMetaballs } from "@/components/effects/hero-metaballs";
import { HeroTaglineFlip } from "@/components/sections/hero-tagline-flip";
import {
  HeroVerbTicker,
  verbPhrase,
} from "@/components/sections/hero-verb-ticker";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { HeroCtaFlow } from "@/components/sections/hero-cta-flow";
import { HeroSignalsFlow } from "@/components/sections/hero-signals-flow";
import type { PortfolioContent } from "@/data/content";

type HeroContent = {
  readonly identity: PortfolioContent["identity"];
  readonly hero: PortfolioContent["hero"];
};

export function Hero({ content }: { content: HeroContent }) {
  const { identity, hero } = content;
  const { forced } = useMotionPreference();
  // Native media-query read (lib/use-prefers-reduced-motion.ts) — motion's
  // useReducedMotion() freezes its first-render value and does not yield
  // the reduced branch under an OS reduce setting in this app (run-9
  // iter 1 diagnosis); the native hook is the branch's source of truth.
  const osReduce = usePrefersReducedMotion();
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
  // Run 9 (RUN9-HERO-TRANSFORM): in motion mode the wordmark is a live
  // particle sculpture (GATHER technique) instead of the ASCII glyph field
  // — it assembles from a scatter on load and repels from the pointer.
  // The assembly IS the entrance, so the band no longer fade-rises; the
  // old 0.95s fade survives only as the reduced-motion path's instant
  // render. Reduced motion keeps the ASCIIText BERAT untouched (crisp
  // final frame, no canvas loop).
  const particleMode = !reduceMotion;

  return (
    <section
      id="home"
      data-light-chapter="home"
      aria-labelledby="home-heading"
      className="relative flex min-h-[100dvh] scroll-mt-[calc(4rem+env(safe-area-inset-top))] flex-col"
    >
      {/* R6 (run-8 iter 8, RUN8-RULE6): the editorial block used to enter as
          one 0.95s fade-rise. Its details now stagger ~30ms apart in reading
          order — glyph band first, then meta / tagline / CTA / signals —
          same 0.95s duration and site ease-out per element. Run 9: the
          glyph band itself no longer fade-rises in motion mode — the
          particle assembly is its entrance (see the band below). Reduced
          motion renders everything instantly. */}
      <div
        data-hero-editorial
        className="flex w-full flex-1 flex-col"
      >
        <h1 id="home-heading" aria-label={identity.name} className="sr-only">
          {identity.name}
        </h1>

        {/* BERAT as a particle sculpture in motion mode (GATHER technique),
            as React Bits ASCIIText under reduced motion. */}
        <motion.div
          data-hero-glyph-band
          aria-hidden="true"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* RUN10-METABALLS: 2–3 soft light orbs drifting/merging/splitting
              behind the wordmark. The layer is sized exactly like the BERAT
              box (min(100%, 68rem) × clamp(13rem, 32vw, 24rem)) and anchored
              to the band's bottom edge (the band's own padding-bottom), so
              it overlays the wordmark box in both modes; it paints first,
              so the BERAT (positioned, later in DOM) stays on top. */}
          <div
            data-hero-metaballs-wrap
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: "clamp(1.1rem, 2.4vh, 1.85rem)",
              width: "min(100%, 68rem)",
              height: "clamp(13rem, 32vw, 24rem)",
              marginInline: "auto",
              zIndex: 0,
              pointerEvents: "none",
            }}
          >
            <HeroMetaballs reduceMotion={reduceMotion} />
          </div>
          {particleMode ? (
            <ParticleBerat />
          ) : (
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
          )}
        </motion.div>

        {/* Role / location / tagline / scroll — always below the glyph band. */}
        <div data-hero-below>
          <div data-hero-lede>
            <motion.div
              data-hero-meta
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            >
              <span>Based in Santa Cruz, California.</span>
            </motion.div>

            {hero.tagline ? (
              <motion.p
                data-hero-tagline
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
              >
                {/* Screen readers get the first line, once; the flipper is
                    visual (aria-hidden) so it never announces every 3s. */}
                <span className="sr-only">{hero.tagline}</span>
                <HeroTaglineFlip
                  lines={hero.taglines}
                  reduceMotion={reduceMotion}
                />
              </motion.p>
            ) : null}

            {/* RUN9-HERO-VERB-TICKER: the thesis line — what he actually
                does, cycling verb-led phrases from content.ts under a
                static "DOING —" prefix. Same 0.95s entrance stagger,
                slotted between the tagline (0.18s) and the CTA (0.21s);
                held still under reduced motion. Screen readers get the
                first phrase, once; the flipper is visual (aria-hidden). */}
            {hero.verbs?.length ? (
              <motion.p
                data-hero-verb-ticker
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.195 }}
              >
                <span className="sr-only">{verbPhrase(hero.verbs[0])}</span>
                <HeroVerbTicker
                  verbs={hero.verbs}
                  reduceMotion={reduceMotion}
                />
              </motion.p>
            ) : null}

            {/* One call to action (run-10 RUN10-HERO-FLOW): a bead of
                light, not a stamped plate — a luminous pill with a
                breathing glow. Same anchor, same MagneticButton drift,
                same 0.21s entrance stagger; held still under reduced
                motion. */}
            <motion.div
              data-hero-cta-wrap
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.21 }}
            >
              <MagneticButton strength={reduceMotion ? 0 : 0.22} maxDistance={36}>
                <HeroCtaFlow />
              </MagneticButton>
            </motion.div>
          </div>

          {/* RUN10-HERO-FLOW: the signals strip is three rows of light
              — glowing dots, no plate, no numerals, no rules. Same 0.24s
              entrance stagger and same copy; held still under reduced
              motion. */}
          <HeroSignalsFlow
            signals={hero.signals}
            reduceMotion={reduceMotion}
          />
        </div>
      </div>
    </section>
  )
}
