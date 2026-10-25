/**
 * Skill → work linking (run-3 iter 7): the skills ledger is the index,
 * the experience rows and project rows are the proof. A skill links to
 * the work entries whose `technologies` list contains it under an exact,
 * case-insensitive match — never a substring or fuzzy match, so "Python"
 * never claims a "Pythonic" row and "NextJS" never claims "Next.js".
 * Skills with no exact match (Multi-agent systems, RAG, Vitest) stay
 * plain text in the ledger: no dead affordance, no invented mapping.
 */

/** The canonical key for one technology name: trimmed, lowercased. */
export function normalizeTech(value: string): string {
  return value.trim().toLowerCase();
}

/** The `data-work-tech` attribute value for one work entry's stack. */
export function techKeyList(technologies: readonly string[]): string {
  return technologies.map(normalizeTech).join("|");
}

/** True when one work entry's stack contains the skill, exactly. */
export function rowUsesSkill(
  technologies: readonly string[],
  skillName: string,
): boolean {
  const key = normalizeTech(skillName);
  if (key === "") return false;
  return technologies.some((tech) => normalizeTech(tech) === key);
}

/** True when any work entry's stack contains the skill, exactly. */
export function skillHasWork(
  skillName: string,
  workTechLists: readonly (readonly string[])[],
): boolean {
  return workTechLists.some((technologies) =>
    rowUsesSkill(technologies, skillName),
  );
}
