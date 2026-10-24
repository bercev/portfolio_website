import type { PortfolioContent } from "@/data/content";

import { SkillMarquee } from "@/components/effects/skill-marquee";
import { SkillsLedger } from "@/components/sections/skills-ledger";
import { Station } from "@/components/ui/station";

type SkillsProps = {
  readonly content: PortfolioContent["skills"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function Skills({ content, heading }: SkillsProps) {
  return (
    <Station
      id="skills"
      heading={heading}
      className="journey-station--vocab"
    >
      <SkillMarquee groups={content} />
      {/*
        Proof ledger (run-2 iter 39): the visible, grouped record. The
        old sr-only category headings are gone — the ledger's headings
        are the one heading per category, visible to everyone, so screen
        readers don't get the same heading twice.
      */}
      <SkillsLedger groups={content} />
    </Station>
  );
}
