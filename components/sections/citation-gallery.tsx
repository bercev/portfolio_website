/**
 * Citation gallery (run-9 RUN9-CITATION-GALLERY).
 *
 * A publication row's [links] control prints the paper's real links out
 * and fans them into a horizontal gallery strip beneath the row — the
 * 60fps #2121 CRED Tickets Shuffle, in the drawing set's ticket language
 * (the shipped ticket-pop: single pop → print → shuffle → gallery). The
 * strip mounts on open, so the fan-in is keyed to mount: the status line
 * ticks in first, then the four ticket cards spring in ~80ms apart
 * (epilogue-pop spring), each a bordered plate with an accent numeral,
 * a mono label, and a hard offset shadow. Link cards are real data from
 * content.ts (venue link, PDF, the site's paper page); the BibTeX card
 * copies the citation with the row's existing clipboard semantics
 * ([cite] stays as-is — this strip is the gallery, not a replacement).
 * Escape closes the strip; the trigger's aria-expanded tracks it.
 * Reduced motion renders the strip settled from the first frame via the
 * native hook (motion's useReducedMotion() is unreliable in this app,
 * run-9 iter 1).
 */
"use client";

import { motion } from "motion/react";
import { useState } from "react";

import type { Publication } from "@/data/content";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import {
  CITATION_GALLERY_PRESS_SCALE,
  CITATION_GALLERY_SPRING,
  citationCardNumber,
  citationGalleryCards,
  citationGalleryDelay,
  citationGalleryStatus,
} from "@/lib/citation-gallery";

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

async function copyBibtex(bibtex: string) {
  try {
    await navigator.clipboard.writeText(bibtex);
  } catch {
    // Fallback for non-secure contexts: temp textarea.
    const textarea = document.createElement("textarea");
    textarea.value = bibtex;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

export function CitationGallery({
  publication,
  open,
  id,
  onRequestClose,
}: {
  readonly publication: Publication;
  readonly open: boolean;
  readonly id: string;
  readonly onRequestClose: () => void;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const cards = citationGalleryCards(publication);
  const copy = async () => {
    await copyBibtex(publication.bibtex);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      id={id}
      className="journey-cite-gallery"
      data-cite-gallery
      role="group"
      aria-label={`Links for ${publication.title}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onRequestClose();
        }
      }}
    >
      <motion.p
        className="journey-cite-gallery-status"
        aria-hidden="true"
        initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.25, ease: SITE_EASE }
        }
      >
        {citationGalleryStatus(cards.length, publication.venue)}
      </motion.p>
      <ul className="journey-cite-gallery-strip">
        {cards.map((card, index) => {
          const delay = citationGalleryDelay(index);
          const inner = (
            <>
              <span
                className="journey-cite-card-num"
                aria-hidden="true"
              >
                {citationCardNumber(index)}
              </span>
              <span className="journey-cite-card-label">{card.label}</span>
              {card.kind === "copy" ? (
                <span
                  className="journey-cite-card-action"
                  aria-hidden="true"
                >
                  {copied ? "[copied ✓]" : "[copy]"}
                </span>
              ) : (
                <span
                  className="journey-cite-card-arrow"
                  aria-hidden="true"
                >
                  ↗
                </span>
              )}
            </>
          );
          const fan = {
            initial: {
              opacity: reduceMotion ? 1 : 0,
              y: reduceMotion ? 0 : 14,
              scale: reduceMotion ? 1 : 0.96,
            },
            animate: { opacity: 1, y: 0, scale: 1 },
            transition: reduceMotion
              ? { duration: 0 }
              : {
                  type: "spring" as const,
                  ...CITATION_GALLERY_SPRING,
                  delay,
                },
            whileTap: { scale: CITATION_GALLERY_PRESS_SCALE },
          };
          return (
            <li key={card.key}>
              {card.kind === "copy" ? (
                <motion.button
                  type="button"
                  className="journey-cite-card"
                  onClick={copy}
                  aria-live="polite"
                  title="Copy BibTeX citation"
                  {...fan}
                >
                  {inner}
                </motion.button>
              ) : (
                <motion.a
                  className="journey-cite-card"
                  href={card.href}
                  {...(card.key === "venue"
                    ? {
                        target: "_blank",
                        rel: "noopener noreferrer",
                      }
                    : {})}
                  {...fan}
                >
                  {inner}
                  {card.key === "venue" ? (
                    <span className="sr-only"> (opens in a new tab)</span>
                  ) : null}
                </motion.a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
