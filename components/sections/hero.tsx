import type { PortfolioContent } from "@/data/content";

import { AsciiText } from "@/components/effects/ascii-text";
import { ScrambledText } from "@/components/effects/scrambled-text";
import { TraitRotator } from "@/components/effects/trait-rotator";
import { ExternalLink } from "@/components/ui/external-link";

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
      className="relative flex min-h-[100dvh] scroll-mt-[calc(4rem+env(safe-area-inset-top))] items-center justify-center"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-4 pb-16 pt-24 text-center sm:gap-10 sm:px-6 sm:pb-20 sm:pt-24">
        <h1
          id="home-heading"
          aria-label={identity.name}
          className="flex flex-col items-center gap-5 font-serif text-foreground"
        >
          <AsciiText text={identity.shortName} className="block" />
          <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground sm:text-sm">
            {identity.name}
          </span>
        </h1>

        <p className="max-w-3xl font-serif text-2xl leading-tight text-foreground sm:text-3xl sm:leading-tight lg:text-4xl">
          <ScrambledText text={hero.tagline} />
        </p>

        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-sm">
          <TraitRotator traits={hero.traits} />
        </p>

        <div className="flex flex-wrap justify-center gap-2.5">
          {hero.links.map((link, index) => (
            <ExternalLink
              key={link.href}
              href={link.href}
              download={link.download}
              className={
                index === 0
                  ? "min-h-11 border border-foreground bg-foreground px-6 font-medium text-sm text-background no-underline transition-transform hover:-translate-y-0.5 active:translate-y-px"
                  : "min-h-11 border border-border bg-transparent px-6 font-medium text-sm text-foreground no-underline transition-transform hover:-translate-y-0.5 active:translate-y-px"
              }
            >
              {link.label}
            </ExternalLink>
          ))}
        </div>
      </div>
    </section>
  );
}
