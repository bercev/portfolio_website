import { BubbleMenu } from "@/components/chrome/bubble-menu";
import { ScrollProgress } from "@/components/chrome/scroll-progress";
import { SiteHeader } from "@/components/chrome/site-header";
import { EffectStage } from "@/components/effects/effect-stage";
import { About } from "@/components/sections/about";
import { ContactFooter } from "@/components/sections/contact-footer";
import { Experience } from "@/components/sections/experience";
import { Hero } from "@/components/sections/hero";
import { Projects } from "@/components/sections/projects";
import { Publications } from "@/components/sections/publications";
import { Skills } from "@/components/sections/skills";
import { portfolio } from "@/data/content";

export default function Home() {
  return (
    <>
      <EffectStage />
      <SiteHeader links={portfolio.contact.links} />

      <main className="relative z-[var(--z-page-content)]">
        <Hero content={{ identity: portfolio.identity, hero: portfolio.hero }} />
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

      <BubbleMenu items={portfolio.navigation} />
      <ScrollProgress />
    </>
  );
}
