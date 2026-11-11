import { ContentFrost } from "@/components/effects/content-frost";
import { EffectStage } from "@/components/effects/effect-stage";
import { LightRibbons } from "@/components/effects/light-ribbons";
import { HeroDim } from "@/components/effects/hero-dim";
import { PortfolioChrome } from "@/components/portfolio/portfolio-chrome";
import { PortfolioMain } from "@/components/portfolio/portfolio-main";

/**
 * Background: the animated light-ribbon field (LightRibbons, run 7 —
 * the user-approved Waylume port) as the background layer, with the
 * shader backdrop (EffectStage) suppressed by its data-journey claim.
 * The floating glyph field it replaced stays in the tree unmounted
 * (components/effects/floating-glyphs.tsx) for a later experiment to
 * reintroduce dither/glyph texture over the ribbons. The 3D journey
 * scene files are still in the tree (tests + history) but nothing
 * mounts them.
 *
 * Run 10 (RUN10-HERO-FLOW) removes run 9's BlueprintField — the
 * drafting-table veil (blueprint grid + stipple dots + paper wash) that
 * sat over the ribbons. The ribbons are unveiled: the full light field
 * is the background now, not glow under paper. Nothing else changes
 * about the layer stack — the ribbons still claim data-journey and
 * data-ascii, the frost still calms the content column.
 */
export default function Home() {
  return (
    <>
      <LightRibbons />
      <EffectStage />
      <HeroDim />
      <ContentFrost />
      <PortfolioMain />
      <PortfolioChrome />
    </>
  );
}
