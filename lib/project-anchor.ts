/**
 * Stable per-project row anchors (run-3 iter 14).
 *
 * The skills proof ledger links notes that name a project ("Shipped in
 * Vitae", "Shipped in the Discord bot") to the exact project row, not
 * just the #projects chapter — so each project row needs a stable,
 * content-derived id, and a hash matcher the row component can use to
 * auto-expand on deep-link entry. Slugs derive from the project title
 * only (no new data field, nothing to keep in sync): "Vitae" ->
 * "project-vitae", "AI Discord Chatbot" -> "project-ai-discord-chatbot".
 */
export function projectSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function projectAnchorId(title: string): string {
  return `project-${projectSlug(title)}`;
}

/** True when a URL hash (with or without the leading "#") names this project row. */
export function isProjectHash(hash: string, title: string): boolean {
  if (typeof hash !== "string" || hash.length === 0) return false;
  const bare = hash.startsWith("#") ? hash.slice(1) : hash;
  return bare.length > 0 && bare === projectAnchorId(title);
}
