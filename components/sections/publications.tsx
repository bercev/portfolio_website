"use client";

import { useState } from "react";

import type { PortfolioContent, Publication } from "@/data/content";

import { paperAnchorId } from "@/lib/paper-anchor";
import { AuthorDial } from "@/components/sections/author-dial";
import { CitationGallery } from "@/components/sections/citation-gallery";
import { HoverPreview } from "@/components/ui/hover-preview";
import { DITHER_ROW_STAGGER, useDitherReveal } from "@/components/effects/use-dither-reveal";
import { Station } from "@/components/ui/station";
import {
  plateLabels,
  VenueStamp,
} from "@/components/sections/publication-plate";

/** The site owner's name in the author line — rendered in accent. */
const SELF_AUTHOR = "Berat Ercevik";

type PublicationsProps = {
  readonly content: PortfolioContent["publications"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

function CiteButton({ publication }: { readonly publication: Publication }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publication.bibtex);
    } catch {
      // Fallback for non-secure contexts: temp textarea.
      const textarea = document.createElement("textarea");
      textarea.value = publication.bibtex;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="journey-pub-cite"
      aria-live="polite"
      title="Copy BibTeX citation"
    >
      {copied ? "[copied ✓]" : "[cite]"}
    </button>
  );
}

function scholarlyArticleJsonLd(
  publication: PortfolioContent["publications"][number],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: publication.title,
    description: publication.gloss,
    author: publication.authors.map((author) => ({
      "@type": "Person",
      name: author.name,
      ...(author.orcid ? { identifier: author.orcid } : {}),
    })),
    datePublished: publication.date,
    publisher: {
      "@type": "Organization",
      name: publication.venue,
    },
    sameAs: publication.href,
    encoding: {
      "@type": "MediaObject",
      contentUrl: publication.pdfUrl,
      encodingFormat: "application/pdf",
    },
  };
}

function PublicationRow({
  publication,
  index,
  total,
}: {
  readonly publication: Publication;
  readonly index: number;
  readonly total: number;
}) {
  // RUN8-STYLE-DITHER: the row dissolves in through the blue-noise tile
  // on first scroll into view (reel-4 rule 16, masks for reveals).
  // RUN8-R3-RESIDUAL: rows stagger 30ms apart (reel-4 rule 3).
  const revealRef = useDitherReveal<HTMLElement>(index * DITHER_ROW_STAGGER);
  const labels = plateLabels(index, total);
  // RUN9-CITATION-GALLERY: the row's [links] control fans the paper's
  // real links into a gallery strip beneath the row.
  const [galleryOpen, setGalleryOpen] = useState(false);
  const galleryId = `cite-gallery-${publication.slug}`;
  return (
    <article
      key={publication.href}
      id={paperAnchorId(publication.slug)}
      ref={revealRef}
      data-dither-reveal
      data-publication-row
      data-publication-lead={index === 0 ? "true" : undefined}
      className="journey-pub-row journey-pub-row--plate scroll-mt-[calc(4rem+env(safe-area-inset-top))]"
    >
      {/* Journal masthead rule — a child div, not a border on the row: the
          e2e frost test requires the row itself to keep border-top 0,
          transparent background, and no box-shadow. */}
      <div className="journey-pub-plate-rule" aria-hidden="true" />
      <figure className="journey-pub-figure">
        <a href={publication.href} className="journey-pub-figure-link">
          {/* eslint-disable-next-line @next/next/no-img-element -- local paper preview, same as HoverPreview's img */}
          <img
            src={publication.preview.src}
            alt={publication.preview.alt}
            width={publication.preview.width}
            height={publication.preview.height}
            loading="lazy"
          />
        </a>
        <figcaption className="journey-pub-fig-caption">
          {labels.fig} — First page
        </figcaption>
        <VenueStamp venue={publication.venue} index={index} />
        {/* The stamp is aria-hidden chrome; the venue stays in the
            accessible tree here. */}
        <span className="sr-only">{publication.venue}</span>
      </figure>
      <div className="journey-pub-body">
        <p className="journey-pub-kicker" aria-hidden="true">
          {labels.plate}
        </p>
        <HoverPreview
          title={publication.title}
          href={publication.href}
          pdfUrl={publication.pdfUrl}
          headingClassName={
            index === 0
              ? "journey-pub-title journey-pub-title--lead"
              : "journey-pub-title"
          }
          linkClassName="decoration-portfolio-accent"
          linkIconSize={24}
          previewClassName="journey-pub-preview"
        />
        <p className="journey-pub-gloss">{publication.gloss}</p>
        <p className="journey-pub-authors">
          {publication.authors.map((author, authorIndex) => (
            <span key={author.name}>
              {authorIndex > 0 ? " · " : null}
              <span
                className={
                  author.name === SELF_AUTHOR
                    ? "journey-pub-author--self"
                    : undefined
                }
              >
                {author.name}
              </span>
            </span>
          ))}
        </p>
        <div className="journey-pub-meta">
          <span className="journey-pub-date">{publication.date}</span>
          <CiteButton publication={publication} />
          <button
            type="button"
            onClick={() => setGalleryOpen((value) => !value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && galleryOpen) {
                event.preventDefault();
                setGalleryOpen(false);
              }
            }}
            className="journey-pub-links"
            aria-expanded={galleryOpen}
            aria-controls={galleryId}
            title="Show the paper's links"
          >
            {galleryOpen ? "[links ↑]" : "[links ↓]"}
          </button>
          {/* RUN9-AUTHOR-DIALS: the radial author-position gauge — his
              real slot among the paper's authors, at the row's right end. */}
          <AuthorDial authors={publication.authors} index={index} />
        </div>
        <CitationGallery
          publication={publication}
          open={galleryOpen}
          id={galleryId}
          onRequestClose={() => setGalleryOpen(false)}
        />
      </div>
    </article>
  );
}

export function Publications({ content, heading }: PublicationsProps) {
  return (
    <Station
      id="publications"
      heading={heading}
      className="journey-station--proof"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": content.map(scholarlyArticleJsonLd),
          }),
        }}
      />
      <div className="journey-pub-list journey-ledger">
        {content.map((publication, index) => (
          <PublicationRow
            key={publication.href}
            publication={publication}
            index={index}
            total={content.length}
          />
        ))}
      </div>
    </Station>
  );
}
