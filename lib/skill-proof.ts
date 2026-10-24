/**
 * Proof links for the skills ledger (run-2 IDEA, research iter 39).
 *
 * The skills data already carries proof — every skill has a `note` like
 * "Shipped in Vitae" — but the marquee renders names only and keeps the
 * note in a `title` tooltip, so a sighted visitor (and any touch visitor)
 * never sees the proof, and the categories are sr-only headings. The
 * ledger surfaces both visibly. This helper maps a note to the chapter
 * that proves it, at CHAPTER level only: the site has no per-project
 * row anchors to link to, so a note that names a project links to the
 * #projects chapter, and "see publications" links to #publications.
 * Anything ambiguous ("Internship + research" names no single chapter,
 * "Daily driver" names none) links nowhere — plain visible text is
 * still the win, and a wrong link would be worse than none.
 */
export function skillProofHref(note: string): "#projects" | "#publications" | null {
  if (typeof note !== "string" || note.length === 0) return null;
  const lower = note.toLowerCase();
  if (lower.includes("publications")) return "#publications";
  if (lower.includes("vitae")) return "#projects";
  if (lower.includes("discord bot")) return "#projects";
  return null;
}
