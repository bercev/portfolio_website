/**
 * Parts bins for the skills catalog (run-9 RUN9-SKILLS-BINS): the
 * uniform 3-column grid of identical plates becomes a bin wall whose
 * rhythm comes from real usage data, not decoration.
 *
 * A skill is filed under every work entry whose `technologies` stack
 * lists it, under the same exact-match rule as the skill→work
 * highlight (lib/skill-work.ts) — so "Python" claims Stealth Startup,
 * Algoverse and the Discord bot, while "RAG" claims no stack at all.
 * The bin width follows the filing depth (a skill used in >=2 entries
 * gets a double-width bin); a skill no stack lists is a loose bin,
 * proved by its note, not by a stack. Pure functions, server-safe.
 */
import { rowUsesSkill } from "@/lib/skill-work";

/**
 * One work entry the ledger can file a skill under: the name as shown
 * on the site (experience organization or project title) + its stack.
 * Built in portfolio-main.tsx from content.ts, experience first, then
 * projects — the same order as the old workTech lists.
 */
export type SkillWorkEntry = {
  readonly name: string;
  readonly technologies: readonly string[];
};

/** The work-entry names whose stack lists the skill, in content order. */
export function skillUses(
  skillName: string,
  entries: readonly SkillWorkEntry[],
): readonly string[] {
  return entries
    .filter((entry) => rowUsesSkill(entry.technologies, skillName))
    .map((entry) => entry.name);
}

/** Bin width: a skill filed under >=2 entries gets a double-width bin. */
export function skillBinSpan(useCount: number): 1 | 2 {
  return useCount >= 2 ? 2 : 1;
}

/** Bin kind: "filed" when a stack lists the skill, "loose" otherwise. */
export function skillBinKind(useCount: number): "filed" | "loose" {
  return useCount === 0 ? "loose" : "filed";
}
