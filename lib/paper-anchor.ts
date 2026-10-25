/**
 * Stable per-paper row anchors (run-3 iter 31).
 *
 * Mirrors project-anchor.ts, but keyed on the publication's data slug
 * ("skilloptimizer", "grokset") rather than a title-derived slug: titles
 * carry "@", ":", and trailing periods, so a title slug would be long
 * and fragile, while the data slug is already the stable key (it is also
 * the /publications/[slug] route key), so the row anchor can never drift
 * from the paper page. "skilloptimizer" -> "paper-skilloptimizer".
 *
 * Paper rows are not expandable panels, so unlike project rows there is
 * no hash-expand state to drive — the id plus the row's scroll-mt offset
 * is the whole mechanism; the browser's native anchor landing does the
 * rest.
 */
export function paperAnchorId(slug: string): string {
  return `paper-${slug}`;
}

/** True when a URL hash (with or without the leading "#") names this paper row. */
export function isPaperHash(hash: string, slug: string): boolean {
  if (typeof hash !== "string" || hash.length === 0) return false;
  const bare = hash.startsWith("#") ? hash.slice(1) : hash;
  return bare.length > 0 && bare === paperAnchorId(slug);
}
