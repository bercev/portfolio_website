/**
 * Terminal `search` command (run-3 iter 20; roles added run-3 iter 40).
 *
 * Pure free-text matcher over the shell's own content — projects, papers,
 * skills, roles — so an explorer who knows a keyword ("Postgres",
 * "GrokSet", "Discord", "Algoverse") but not the file name has a path to
 * it. The shell can list (`projects`, `publications`, `ls`, `cat`) but
 * could not FIND; the skills-ledger highlight only maps exact skill names,
 * not free text.
 *
 * Matching is a plain case-insensitive substring over exactly the fields
 * the filing names — project titles + framing + tech, paper titles +
 * venues, skill names + notes, role titles + organizations + summaries +
 * tech. Deliberately NOT the ledger's exact-match mapping as a ranking
 * (free text is not exact tech keys), and no alias table is invented:
 * "Next.js" does not match the "NextJS" tech row, because the data spells
 * it "NextJS".
 *
 * Each hit carries the `goto` name that lands on it: project rows reuse
 * the iter-14 slug scheme, paper hits print the paper's data slug (the
 * run-3 iter-32 goto-paper extension — `goto grokset` lands on the row
 * via the iter-31 anchor), and skills and roles land on their chapters.
 * Roles are appended AFTER skills: the iter-20 order (projects → papers
 * → skills) stays stable for every pre-existing query, and the new kind
 * extends it rather than re-sorting it.
 * Zero results is an empty list: the shell prints the hint, never
 * navigates.
 */

import type { PortfolioContent } from "@/data/content";
import { projectSlug } from "./project-anchor";

/** The slices search reads — a structural subset, so tests pass fixtures. */
export type SearchableContent = Pick<
  PortfolioContent,
  "projects" | "publications" | "skills" | "experience"
>;

export type SearchHitKind = "project" | "paper" | "skill" | "experience";

export interface SearchHit {
  kind: SearchHitKind;
  /** Display label: project title, paper title, or skill name. */
  label: string;
  /** One-line detail: framing for projects, venue for papers, note for skills. */
  detail: string;
  /** The `goto` argument that lands on this hit. */
  goto: string;
}

/** Cap: a terminal dump longer than this scrolls the useful hits away. */
export const SEARCH_RESULT_LIMIT = 8;

function haystack(parts: readonly (string | undefined)[]): string {
  return parts
    .filter((p): p is string => typeof p === "string" && p.length > 0)
    .join(" ")
    .toLowerCase();
}

export function searchPortfolio(
  query: string,
  content: SearchableContent,
): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const hits: SearchHit[] = [];
  for (const project of content.projects) {
    if (
      haystack([project.title, project.framing, ...project.technologies]).includes(
        needle,
      )
    ) {
      hits.push({
        kind: "project",
        label: project.title,
        detail: project.framing,
        goto: projectSlug(project.title),
      });
    }
  }
  for (const paper of content.publications) {
    if (haystack([paper.title, paper.venue]).includes(needle)) {
      hits.push({ kind: "paper", label: paper.title, detail: paper.venue, goto: paper.slug });
    }
  }
  for (const category of content.skills) {
    for (const skill of category.items) {
      if (haystack([skill.name, skill.note]).includes(needle)) {
        hits.push({ kind: "skill", label: skill.name, detail: skill.note, goto: "skills" });
      }
    }
  }
  // Roles last: the iter-20 kind order stays stable, experience extends it.
  for (const role of content.experience) {
    if (
      haystack([
        role.role,
        role.organization,
        role.summary,
        ...role.technologies,
      ]).includes(needle)
    ) {
      hits.push({
        kind: "experience",
        label: role.role,
        detail: role.organization
          ? `${role.organization} (${role.dates})`
          : role.dates,
        goto: "experience",
      });
    }
  }
  return hits.slice(0, SEARCH_RESULT_LIMIT);
}
