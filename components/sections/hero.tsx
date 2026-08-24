import type { PortfolioContent } from "@/data/content";

import { HeroParticleText } from "@/components/effects/hero-particle-text";
import { Skills } from "@/components/sections/skills";

type HeroContent = {
  readonly identity: PortfolioContent["identity"];
  readonly hero: PortfolioContent["hero"];
  readonly skills: PortfolioContent["skills"];
};

export function Hero({
  content,
  skillsHeading,
}: {
  content: HeroContent;
  skillsHeading: PortfolioContent["navigation"][number]["label"];
}) {
  const { identity, hero, skills } = content;

  return (
    <section
      id="home"
      aria-labelledby="home-heading"
      className="relative flex min-h-[100dvh] scroll-mt-[calc(4rem+env(safe-area-inset-top))] items-center"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-4 pb-12 pt-20 text-center sm:gap-5 sm:px-6 sm:pb-16 lg:px-8">
        <h1
          id="home-heading"
          aria-label={identity.name}
          className="w-full text-foreground"
        >
          <HeroParticleText text={identity.shortName} />
        </h1>

        {hero.tagline ? (
          <p className="max-w-3xl text-lg font-medium leading-relaxed text-muted-foreground sm:text-xl sm:leading-relaxed lg:text-2xl">
            {hero.tagline}
          </p>
        ) : null}

        <Skills content={skills} heading={skillsHeading} />

        <p className="max-w-3xl text-lg font-medium leading-relaxed text-foreground sm:text-xl sm:leading-relaxed lg:text-2xl">
          {hero.bio}
        </p>
      </div>
    </section>
  );
}
