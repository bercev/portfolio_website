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
  const familyName = identity.name.slice(identity.shortName.length).trim();

  return (
    <section
      id="home"
      aria-labelledby="home-heading"
      className="relative flex min-h-[100dvh] scroll-mt-[calc(4rem+env(safe-area-inset-top))] items-center"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-7 px-4 pb-16 pt-24 sm:gap-10 sm:px-6 sm:pb-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)] lg:items-end lg:gap-16 lg:px-8 lg:pb-16 lg:pt-24">
        <h1
          id="home-heading"
          aria-label={identity.name}
          className="min-w-0 font-serif tracking-[-0.045em] text-foreground"
        >
          <AsciiText text={identity.shortName} className="block" />
          <span
            aria-hidden="true"
            className="mt-4 block text-[clamp(3.45rem,8vw,7rem)] leading-[0.82]"
          >
            {familyName}
          </span>
        </h1>

        <div className="max-w-xl lg:pb-1">
          <p className="font-serif text-[clamp(1.75rem,3.2vw,2.7rem)] leading-[1.02] tracking-[-0.025em] text-foreground">
            <ScrambledText text={hero.tagline} />
          </p>
          <p className="mt-4 max-w-[58ch] text-sm leading-6 text-muted-foreground sm:mt-5 sm:text-base sm:leading-7">
            {hero.bio}
          </p>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.16em] text-foreground sm:mt-5">
            <TraitRotator traits={hero.traits} />
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5 sm:mt-6">
            {hero.links.map((link, index) => (
              <ExternalLink
                key={link.href}
                href={link.href}
                download={link.download}
                className={
                  index === 0
                    ? "min-h-11 rounded-full bg-portfolio-accent px-5 font-mono text-sm font-semibold text-portfolio-accent-foreground no-underline transition-transform hover:-translate-y-0.5 hover:text-portfolio-accent-foreground hover:no-underline active:translate-y-px"
                    : "min-h-11 rounded-full border border-border bg-background/75 px-5 font-mono text-sm font-semibold text-foreground no-underline backdrop-blur-sm transition-transform hover:-translate-y-0.5 hover:text-foreground hover:no-underline active:translate-y-px"
                }
              >
                {link.label}
              </ExternalLink>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
