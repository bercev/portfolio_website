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
