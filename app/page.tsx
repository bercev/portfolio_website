import { ContentFrost } from "@/components/effects/content-frost";
import { EffectStage } from "@/components/effects/effect-stage";
import { Journey } from "@/components/effects/journey";
import { PortfolioChrome } from "@/components/portfolio/portfolio-chrome";
import { PortfolioMain } from "@/components/portfolio/portfolio-main";
import { portfolio } from "@/data/content";
import { buildJourneyPropManifest } from "@/data/journey-props";

const journeyStationCounts = [
  1, // About — one origin (education)
  portfolio.publications.length,
  portfolio.experience.length,
  portfolio.projects.length,
  portfolio.skills.reduce((total, category) => total + category.items.length, 0),
] as const;

const journeyProps = buildJourneyPropManifest();

/**
 * The Journey geometry background is retired in favor of the shader backdrop
 * (wired in EffectStage). Kept as a fallback: set to true to restore the
 * three.js scene instead of the shader.
 */
const USE_JOURNEY_BACKGROUND = false;

export default function Home() {
  return (
    <>
      {USE_JOURNEY_BACKGROUND ? (
        <Journey stationCounts={journeyStationCounts} props={journeyProps} />
      ) : null}
      <EffectStage />
      <ContentFrost />
      <PortfolioMain />
      <PortfolioChrome />
    </>
  );
}
