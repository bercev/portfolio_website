import { portfolio, type SectionId } from "./content";

/**
 * The compile narrative: each chapter of the journey is a step in a build
 * pipeline. Displayed as terminal build-log lines in the chapter gates.
 *
 * Counts are derived from the portfolio data so they never go stale.
 */
function buildLogs(): Record<SectionId, readonly string[]> {
  const pubs: number = portfolio.publications.length;
  const roles: number = portfolio.experience.length;
  const projs: number = portfolio.projects.length;
  return {
    home: ["compiling curiosity.c → curiosity.o"],
    about: ["linking background... OK", "resolving education... UC Santa Cruz"],
    publications: [`linking publications... ${pubs} paper${pubs === 1 ? "" : "s"} linked`],
    experience: [
      "warning: sleep not found",
      `linking experience... ${roles} role${roles === 1 ? "" : "s"} linked`,
    ],
    projects: [
      `building projects... ${projs} shipped`,
      "optimizing for fun... -O3",
    ],
    skills: ["optimizing skills... -O3", "all targets up to date"],
    contact: ["./future --run"],
  };
}

export const BUILD_LOGS: Record<SectionId, readonly string[]> = buildLogs();

/** Chapters whose build log ends with a live prompt (blinking cursor). */
export const BUILD_LOG_LIVE_PROMPT: ReadonlySet<SectionId> = new Set([
  "contact",
]);
