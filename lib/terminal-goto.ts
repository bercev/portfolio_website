/**
 * Terminal `goto` targets (run-3 iter 18).
 *
 * Pure resolver: a shell word maps to a page anchor. Chapters are the
 * section ids; project rows reuse the iter-14 anchor scheme
 * (`project-<slug>`), so `goto vitae` lands on the exact row and its
 * hashchange effect expands it — no new anchor scheme, no new plumbing.
 * Paper rows reuse the run-3 iter-31 anchor scheme (`paper-<slug>`,
 * keyed on the publication's data slug, not its title — titles carry
 * "@", ":", and trailing periods), so `goto skilloptimizer` lands on
 * the exact row. Unknown input returns null: the shell prints the
 * target list instead of navigating anywhere.
 */

import { paperAnchorId } from "./paper-anchor";
import { projectSlug } from "./project-anchor";

export interface GotoTarget {
  /** Single-token completion name, e.g. "vitae" or "ai-discord-chatbot". */
  name: string;
  /** Human label printed by the shell, e.g. "Vitae". */
  label: string;
  hash: string;
}

const CHAPTERS: ReadonlyArray<{
  names: readonly string[];
  label: string;
  hash: string;
}> = [
  { names: ["home", "top"], label: "Home", hash: "#home" },
  { names: ["about"], label: "About", hash: "#about" },
  { names: ["publications", "papers"], label: "Publications", hash: "#publications" },
  { names: ["experience"], label: "Experience", hash: "#experience" },
  { names: ["projects", "work"], label: "Projects", hash: "#projects" },
  { names: ["skills"], label: "Skills", hash: "#skills" },
  { names: ["contact", "hire"], label: "Contact", hash: "#contact" },
];

/** A paper goto target: the data slug plus the human label. */
export interface PaperGotoTarget {
  slug: string;
  label: string;
}

/** All goto targets for given project titles + paper targets (chapters, projects, papers). */
export function gotoTargets(
  projectTitles: readonly string[],
  papers: readonly PaperGotoTarget[] = [],
): GotoTarget[] {
  const chapters = CHAPTERS.map((c) => ({
    name: c.names[0],
    label: c.label,
    hash: c.hash,
  }));
  const rows = projectTitles.map((title) => ({
    name: projectSlug(title),
    label: title,
    hash: `#project-${projectSlug(title)}`,
  }));
  const paperRows = papers.map((p) => ({
    name: p.slug,
    label: p.label,
    hash: `#${paperAnchorId(p.slug)}`,
  }));
  return [...chapters, ...rows, ...paperRows];
}

/** Single-token names for tab-completion (chapters + project slugs + paper slugs). */
export function gotoCompletionNames(
  projectTitles: readonly string[],
  papers: readonly PaperGotoTarget[] = [],
): string[] {
  return gotoTargets(projectTitles, papers).map((t) => t.name);
}

function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolve a `goto` argument to its target, or null when unknown.
 * Matching is case-insensitive and accepts the chapter aliases, the
 * project title ("AI Discord Chatbot"), the hyphenated project slug
 * ("ai-discord-chatbot"), and the paper data slug ("skilloptimizer",
 * "grokset") — all through the same normalization, so no alias table
 * can drift from the anchor schemes.
 */
export function resolveGotoTarget(
  input: string,
  projectTitles: readonly string[],
  papers: readonly PaperGotoTarget[] = [],
): GotoTarget | null {
  const norm = normalize(input);
  if (!norm) return null;
  for (const chapter of CHAPTERS) {
    if (chapter.names.includes(norm)) {
      return { name: chapter.names[0], label: chapter.label, hash: chapter.hash };
    }
  }
  for (const title of projectTitles) {
    const slug = projectSlug(title);
    if (norm === slug.replace(/-/g, " ") || norm === title.toLowerCase()) {
      return { name: slug, label: title, hash: `#project-${slug}` };
    }
  }
  // Paper slugs only — never title-derived (titles carry "@"/":").
  // The chapter alias "papers" above still wins for the chapter target.
  for (const paper of papers) {
    if (norm === paper.slug.toLowerCase()) {
      return {
        name: paper.slug,
        label: paper.label,
        hash: `#${paperAnchorId(paper.slug)}`,
      };
    }
  }
  return null;
}
