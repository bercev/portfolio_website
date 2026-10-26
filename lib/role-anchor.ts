/**
 * Stable per-role row anchors (run-3 iter 42).
 *
 * Mirrors paper-anchor.ts, but keyed on the role title slug: experience
 * rows have no data slug (unlike papers), so they follow the project
 * precedent (project-anchor.ts: title-derived slug). The four role
 * titles are unique, so the title slug is unambiguous — "LLM Researcher"
 * -> "role-llm-researcher". Role rows are plain articles, not expandable
 * panels, so like paper rows there is no hash-expand state to drive —
 * the id plus the row's scroll-mt offset is the whole mechanism; the
 * browser's native anchor landing (or the flyout's goto jump) does the
 * rest.
 */
export function roleSlug(role: string): string {
  return role
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function roleAnchorId(role: string): string {
  return `role-${roleSlug(role)}`;
}

/** True when a URL hash (with or without the leading "#") names this role row. */
export function isRoleHash(hash: string, role: string): boolean {
  if (typeof hash !== "string" || hash.length === 0) return false;
  const bare = hash.startsWith("#") ? hash.slice(1) : hash;
  return bare.length > 0 && bare === roleAnchorId(role);
}
