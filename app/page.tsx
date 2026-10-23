import { ContentFrost } from "@/components/effects/content-frost";
import { EffectStage } from "@/components/effects/effect-stage";
import { FloatingGlyphs } from "@/components/effects/floating-glyphs";
import { HeroDim } from "@/components/effects/hero-dim";
import { PortfolioChrome } from "@/components/portfolio/portfolio-chrome";
import { PortfolioMain } from "@/components/portfolio/portfolio-main";

/**
 * Background: the shader backdrop (EffectStage) as the atmospheric base
 * layer, with the floating ASCII/glyph field above it. The 3D journey
 * scene that used to sit here was retired on 2026-10-22 at the user's
 * direction — it read as a washed ribbon / blurry bands; he asked for
 * simple floating glyphs instead. The journey scene files are still in
 * the tree (tests + history) but nothing mounts them.
 */
export default function Home() {
  return (
    <>
      <FloatingGlyphs />
      <EffectStage />
      <HeroDim />
      <ContentFrost />
      <PortfolioMain />
      <PortfolioChrome />
    </>
  );
}
