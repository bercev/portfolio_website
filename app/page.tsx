import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Experience } from "@/components/sections/experience";
import { Projects } from "@/components/sections/projects";
import { Publications } from "@/components/sections/publications";
import { ResumeSection } from "@/components/sections/resume-section";
import { Contact } from "@/components/sections/contact";

export default function Home() {
  return (
    <main className="relative z-10 bg-background">
      <Hero />
      <About />
      <Experience />
      <Projects />
      <Publications />
      <ResumeSection />
      <Contact />
    </main>
  );
}
