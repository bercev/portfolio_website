/**
 * Terminal `goto` targets (run-3 iter 18).
 *
 * Pure resolver: a shell word maps to a page anchor. Chapters are the
 * section ids; project rows reuse the iter-14 anchor scheme
 * (`project-<slug>`), so `goto vitae` lands on the exact row and its
 * hashchange effect expands it — no new anchor scheme, no new plumbing.
 * Unknown input returns null: the shell prints the target list instead
 * of navigating anywhere.
 */

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

/** All goto targets for a given project-title list (chapters + rows). */
export function gotoTargets(projectTitles: readonly string[]): GotoTarget[] {
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
  return [...chapters, ...rows];
}

/** Single-token names for tab-completion (chapters + project slugs). */
export function gotoCompletionNames(projectTitles: readonly string[]): string[] {
  return gotoTargets(projectTitles).map((t) => t.name);
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
 * project title ("AI Discord Chatbot"), and the hyphenated slug
 * ("ai-discord-chatbot") — all through the same normalization, so no
 * alias table can drift from the anchor scheme.
 */
export function resolveGotoTarget(
  input: string,
  projectTitles: readonly string[],
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
  return null;
}
