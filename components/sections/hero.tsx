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
      className="relative flex min-h-[100dvh] scroll-mt-[calc(4rem+env(safe-area-inset-top))] items-end"
    >
      <div
        data-hero-editorial
        className="flex w-full flex-col gap-2 pb-[14vh] pt-24"
      >
        <div data-hero-meta aria-hidden="true">
          <span>01 — Home</span>
          <span>{identity.role}</span>
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
          {hero.tagline ? (
            <p className="max-w-[28ch] text-xl font-bold uppercase leading-tight tracking-[-0.02em] text-foreground sm:text-2xl">
              {hero.tagline}
            </p>
          ) : null}

          {hero.bio ? (
            <p className="max-w-[36ch] font-mono text-xs font-semibold uppercase leading-relaxed tracking-[0.08em] text-muted-foreground sm:text-sm">
              {hero.bio}
            </p>
          ) : (
            <span className="journey-scroll-hint">Scroll to fly the journey</span>
          )}
        </div>

        {hero.bio ? (
          <span className="journey-scroll-hint">Scroll to fly the journey</span>
        ) : null}
      </div>
    </section>
  );
}
