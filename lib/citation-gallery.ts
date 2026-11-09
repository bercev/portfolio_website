/**
 * Citation gallery (run-9 RUN9-CITATION-GALLERY): a publication row's
 * [links] control prints the paper's real links out and fans them into a
 * horizontal gallery strip beneath the row — the 60fps #2121 CRED Tickets
 * Shuffle, in the drawing set's ticket language (the shipped ticket-pop:
 * single pop → print → shuffle → gallery). Every card is real data from
 * content.ts: the venue link (OpenReview / arXiv), the PDF, the site's
 * paper page, and the BibTeX copy action. No invented semantics — the
 * venue label is derived from the link's own host.
 */

import type { Publication } from "@/data/content";

/** Spring stagger between cards as they fan out (~80ms per card). */
export const CITATION_GALLERY_STAGGER_MS = 80;

/** Reel-4 press rule: cards scale 0.97 on press. */
export const CITATION_GALLERY_PRESS_SCALE = 0.97;

/** The fan-in spring (epilogue pop family: stiff, lightly underdamped). */
export const CITATION_GALLERY_SPRING = {
  stiffness: 300,
  damping: 18,
} as const;

export type CitationGalleryCardKind = "link" | "copy";

export type CitationGalleryCard = {
  readonly key: string;
  readonly label: string;
  readonly kind: CitationGalleryCardKind;
  /** Present for link cards; the copy card copies the BibTeX instead. */
  readonly href?: string;
};

/** Card number, 1-based and zero-padded: "01". */
export function citationCardNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

/** Fan-out delay for a card: ~80ms spring stagger per card. */
export function citationGalleryDelay(index: number) {
  return (index * CITATION_GALLERY_STAGGER_MS) / 1000;
}

/**
 * The venue link's label, from the link's own host — OpenReview papers
 * print OPENREVIEW, arXiv papers print ARXIV, anything else prints
 * SOURCE rather than inventing a venue name.
 */
export function citationVenueLabel(href: string) {
  try {
    const host = new URL(href).hostname;
    if (host.endsWith("arxiv.org")) return "ARXIV";
    if (host.endsWith("openreview.net")) return "OPENREVIEW";
    return "SOURCE";
  } catch {
    return "SOURCE";
  }
}

/**
 * The four real links for a paper, in gallery order: venue link, PDF,
 * the site's paper page, BibTeX copy.
 */
export function citationGalleryCards(
  publication: Publication,
): CitationGalleryCard[] {
  return [
    {
      key: "venue",
      label: citationVenueLabel(publication.href),
      kind: "link",
      href: publication.href,
    },
    { key: "pdf", label: "PDF", kind: "link", href: publication.pdfUrl },
    {
      key: "paper",
      label: "PAPER",
      kind: "link",
      href: `/publications/${publication.slug}`,
    },
    { key: "bibtex", label: "BIBTEX", kind: "copy" },
  ];
}

/** The status line that ticks in above the strip. */
export function citationGalleryStatus(count: number, venue: string) {
  const tickets = String(count).padStart(2, "0");
  return `PRINTED — ${tickets} TICKETS · ${venue.toUpperCase()}`;
}
