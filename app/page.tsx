import { BubbleMenu } from "@/components/chrome/bubble-menu";
import { LineSidebar } from "@/components/chrome/line-sidebar";
import { SiteHeader } from "@/components/chrome/site-header";
import { ContentFrost } from "@/components/effects/content-frost";
import { EffectStage } from "@/components/effects/effect-stage";
import { Journey } from "@/components/effects/journey";
import { About } from "@/components/sections/about";
import { ContactFooter } from "@/components/sections/contact-footer";
import { Experience } from "@/components/sections/experience";
import { Hero } from "@/components/sections/hero";
import { Projects } from "@/components/sections/projects";
import { Publications } from "@/components/sections/publications";
import { Skills } from "@/components/sections/skills";
import { portfolio } from "@/data/content";

const journeyStationCounts = [
  1, // About — one origin (education)
  portfolio.publications.length,
  portfolio.experience.length,
  portfolio.projects.length,
  portfolio.skills.reduce((total, category) => total + category.items.length, 0),
] as const;

export default function Home() {
  return (
    <>
      <SiteHeader />
      <Journey stationCounts={journeyStationCounts} />
      <EffectStage />
      <ContentFrost />

      <main className="relative z-[var(--z-page-content)]">
        <Hero
          content={{
            identity: portfolio.identity,
            hero: portfolio.hero,
          }}
        />
        <About
          content={portfolio.about}
          heading={portfolio.navigation[1].label}
        />
        <Publications
          content={portfolio.publications}
          heading={portfolio.navigation[2].label}
        />
        <Experience
          content={portfolio.experience}
          heading={portfolio.navigation[3].label}
        />
        <Projects
          content={portfolio.projects}
          heading={portfolio.navigation[4].label}
        />
        <Skills
          content={portfolio.skills}
          heading={portfolio.navigation[5].label}
        />
        <ContactFooter content={portfolio.contact} />
      </main>

      <BubbleMenu links={portfolio.contact.links} />
      <LineSidebar items={portfolio.navigation} />
    </>
  );
}
