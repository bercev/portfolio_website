import { projectAnchorId } from "./project-anchor";

/**
 * Proof links for the skills ledger (run-2 IDEA, research iter 39;
 * row-level since run-3 iter 14).
 *
 * The skills data already carries proof — every skill has a `note` like
 * "Shipped in Vitae" — but the marquee renders names only and keeps the
 * note in a `title` tooltip, so a sighted visitor (and any touch visitor)
 * never sees the proof, and the categories are sr-only headings. The
 * ledger surfaces both visibly. This helper maps a note to the record
 * that proves it: a note naming a project links to that exact project
 * row (`#project-vitae`, `#project-ai-discord-chatbot` — see
 * project-anchor.ts), "see publications" links to #publications.
 * Anything ambiguous ("Internship + research" names no single project,
 * "Daily driver" names none) links nowhere — plain visible text is
 * still the win, and a wrong link would be worse than none.
 *
 * Judgment call, documented: "Discord bot + research" names the Discord
 * bot project, so it lands on the chatbot row even though its research
 * half has no row — the specific half beats no link.
 */
export function skillProofHref(note: string): string | null {
  if (typeof note !== "string" || note.length === 0) return null;
  const lower = note.toLowerCase();
  if (lower.includes("publications")) return "#publications";
  if (lower.includes("vitae")) return `#${projectAnchorId("Vitae")}`;
  if (lower.includes("discord bot"))
    return `#${projectAnchorId("AI Discord Chatbot")}`;
  return null;
}
