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
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-4 pb-16 pt-24 text-center sm:gap-8 sm:px-6 sm:pb-20 sm:pt-24">
        <h1
          id="home-heading"
          aria-label={identity.name}
          className="flex flex-col items-center gap-3 font-serif text-foreground"
        >
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {identity.name}
          </span>
          <AsciiText text={identity.shortName} className="block" />
        </h1>

        <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          <ScrambledText text={hero.tagline} />
        </p>

        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
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
                  ? "min-h-11 border border-foreground bg-foreground px-5 font-mono text-sm font-semibold text-background no-underline transition-transform hover:-translate-y-0.5 active:translate-y-px"
                  : "min-h-11 border border-border bg-transparent px-5 font-mono text-sm font-semibold text-foreground no-underline transition-transform hover:-translate-y-0.5 active:translate-y-px"
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
