import { portfolio } from "@/data/content";
import { iconForTech } from "@/lib/tech-icons";

/** Preview card parked beside a Journey chapter sculpture. */
export type JourneyPreviewProp = {
  readonly id: string;
  readonly label: string;
  /** Public asset URL — image textures only on full quality. */
  readonly src?: string;
  readonly aspect: number;
  /** Station index: 0 About … 5 Contact. */
  readonly stationIndex: number;
  readonly kind: "image" | "badge";
};

export type JourneyTechProp = {
  readonly label: string;
  /** Palette stop index into Journey accent/cyan/emerald/amber/coral. */
  readonly tint: number;
};

export type JourneyPropManifest = {
  readonly previews: readonly JourneyPreviewProp[];
  readonly tech: readonly JourneyTechProp[];
  /** Short role chips near the Experience station. */
  readonly roles: readonly string[];
};

/**
 * Curated stack for floating Journey badges — prefer names with Simple Icons
 * glyphs so the background reads as logos, not generic type.
 */
const FEATURED_TECH: readonly JourneyTechProp[] = [
  { label: "Python", tint: 0 },
  { label: "TypeScript", tint: 1 },
  { label: "NextJS", tint: 2 },
  { label: "React", tint: 1 },
  { label: "LLMs", tint: 3 },
  { label: "LangChain", tint: 0 },
  { label: "Docker", tint: 2 },
  { label: "GCP", tint: 3 },
  { label: "PostgreSQL", tint: 2 },
  { label: "Ollama", tint: 4 },
  { label: "Jest", tint: 1 },
  { label: "CI/CD", tint: 4 },
].filter((tech) => iconForTech(tech.label) !== null);

function shortRole(role: string) {
  return role
    .replace(" Intern", "")
    .replace("AI Systems Engineer", "AI Systems")
    .replace("Software Engineer", "SWE");
}

/**
 * Content-aware props for the Journey WebGL spine — paper/project previews
 * and floating tech icons, sourced from portfolio data.
 */
export function buildJourneyPropManifest(): JourneyPropManifest {
  const [skillOptimizer, grokSet] = portfolio.publications;
  const [vitae, discord] = portfolio.projects;

  return {
    previews: [
      {
        id: "skilloptimizer",
        label: "SkillOptimizer",
        src: skillOptimizer.preview.src,
        aspect: skillOptimizer.preview.width / skillOptimizer.preview.height,
        stationIndex: 1,
        kind: "image",
      },
      {
        id: "grokset",
        label: "@GrokSet",
        src: grokSet.preview.src,
        aspect: grokSet.preview.width / grokSet.preview.height,
        stationIndex: 1,
        kind: "image",
      },
      {
        id: "vitae",
        label: vitae.title,
        src: "/assets/projects/vitae.png",
        aspect: 16 / 10,
        stationIndex: 3,
        kind: "image",
      },
      {
        id: "discord-bot",
        label: discord.title,
        aspect: 1.6,
        stationIndex: 3,
        kind: "badge",
      },
    ],
    tech: FEATURED_TECH,
    roles: portfolio.experience.map((item) => shortRole(item.role)),
  };
}
