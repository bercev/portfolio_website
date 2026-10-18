"use client";

import { useState } from "react";

import type { PortfolioContent, Publication } from "@/data/content";

import { HoverPreview } from "@/components/ui/hover-preview";
import { Station } from "@/components/ui/station";

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
          <article
            key={publication.href}
            data-publication-row
            data-publication-lead={index === 0 ? "true" : undefined}
            className={
              index === 0
                ? "journey-pub-row journey-pub-row--lead"
                : "journey-pub-row"
            }
          >
            <p className="journey-pub-index" aria-hidden="true">
              {index + 1}
            </p>
            <div className="journey-pub-main">
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
            </div>
            <aside
              className="journey-pub-marginalia"
              aria-label="Venue and date"
            >
              <span className="journey-pub-venue">{publication.venue}</span>
              <span className="journey-pub-date">{publication.date}</span>
              <CiteButton publication={publication} />
            </aside>
          </article>
        ))}
      </div>
    </Station>
  );
}
