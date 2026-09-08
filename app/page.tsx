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

export default function Home() {
  return (
    <>
      <Journey stationCounts={journeyStationCounts} props={journeyProps} />
      <EffectStage />
      <ContentFrost />
      <PortfolioMain />
      <PortfolioChrome />
    </>
  );
}
