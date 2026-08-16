import type { PortfolioContent } from "@/data/content";

import { HeroParticleText } from "@/components/effects/hero-particle-text";

type HeroContent = {
  readonly identity: PortfolioContent["identity"];
  readonly hero: PortfolioContent["hero"];
};

export function Hero({ content }: { content: HeroContent }) {
  const { identity, hero } = content;

  return (
    <section
      id="home"
      aria-labelledby="home-heading"
      className="relative flex min-h-[100dvh] scroll-mt-[calc(4rem+env(safe-area-inset-top))] items-center"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 px-4 pb-20 pt-24 text-center sm:gap-7 sm:px-6 sm:pb-24 lg:px-8">
        <h1
          id="home-heading"
          aria-label={identity.name}
          className="w-full text-foreground"
        >
          <HeroParticleText text={identity.shortName} />
        </h1>

        <p className="max-w-3xl text-lg font-medium leading-relaxed text-foreground sm:text-xl sm:leading-relaxed lg:text-2xl">
          {hero.bio}
        </p>
      </div>
    </section>
  );
}
