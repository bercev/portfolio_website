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

/** Resolve a `?skill=` query value to a known skill name, or null.
 *
 * Run-3 iter 22 (?skill= deep links, mirroring ?topic= in
 * lib/contact-topics.ts): the value is matched case-insensitively
 * against the ledger's own skill names ONLY — an unknown value is
 * ignored, never rendered, so a crafted URL cannot inject arbitrary
 * text into the ledger. No alias table: free text is not an exact tech
 * key (see the iter-20 search item), so "Next.js" matches nothing while
 * "NextJS" matches the ledger row. The caller additionally gates on
 * skillHasWork: only a skill that is a ledger button (linked to work)
 * may become the highlight, since plain-text skills have no highlight
 * affordance to activate. */
export function resolveSkillParam(
  raw: string | null,
  skillNames: readonly string[],
): string | null {
  if (raw === null) return null;
  const needle = normalizeTech(raw);
  if (needle === "") return null;
  return skillNames.find((name) => normalizeTech(name) === needle) ?? null;
}

/**
 * Reverse navigation (run-3 iter 23): the custom event a linked
 * project-row pill click dispatches so the skills ledger can highlight
 * that skill and land the visitor on it — the reverse of the
 * skill→work click path. The detail carries the pill's normalized tech
 * key (the `data-tech` value); the ledger resolves it to the canonical
 * skill name and gates on skillHasWork, so a stray or unlinked key is
 * ignored rather than rendered.
 */
export const SKILL_HIGHLIGHT_EVENT = "portfolio:highlight-skill";

/** Dispatch a reverse-navigation highlight request for one pill key. */
export function dispatchSkillHighlight(skillKey: string): void {
  window.dispatchEvent(
    new CustomEvent(SKILL_HIGHLIGHT_EVENT, { detail: { skillKey } }),
  );
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
