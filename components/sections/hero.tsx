import type { PortfolioContent } from "@/data/content";

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
      className="relative flex min-h-[100dvh] scroll-mt-[calc(4rem+env(safe-area-inset-top))] items-end justify-center text-center"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-5 px-4 pb-[16vh] pt-24 sm:px-6 lg:px-8">
        <h1
          id="home-heading"
          aria-label={identity.name}
          className="sr-only"
        >
          {identity.name}
        </h1>

        {/* The journey canvas renders the name in 3D particles; this is the flat fallback. */}
        <div data-hero-name-fallback aria-hidden="true">
          {identity.shortName.toUpperCase()}
        </div>

        {hero.tagline ? (
          <p className="max-w-3xl text-lg font-medium leading-relaxed text-muted-foreground sm:text-xl sm:leading-relaxed lg:text-2xl">
            {hero.tagline}
          </p>
        ) : null}

        {hero.bio ? (
          <p className="max-w-3xl text-base font-medium leading-relaxed text-muted-foreground sm:text-lg sm:leading-relaxed">
            {hero.bio}
          </p>
        ) : null}

        <span className="journey-scroll-hint">Scroll to fly the journey</span>
      </div>
    </section>
  );
}
