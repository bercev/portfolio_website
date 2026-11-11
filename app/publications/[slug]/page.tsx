import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { portfolio, type Publication } from "@/data/content";

import { BibtexBlock } from "./bibtex-block";
import { getPaperSheet } from "./paper-sheet";
import { PaperFigure } from "./paper-figure";
import { PaperSignature } from "./paper-signature";
import { PaperActionPlate } from "@/components/sections/paper-action-plate";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.URL ??
  "http://localhost:3000";

function getPublication(slug: string): Publication | undefined {
  return portfolio.publications.find((paper) => paper.slug === slug);
}

/** ISO-ish date for schema.org / citation meta from the display date. */
function isoDate(publication: Publication): string {
  const parsed = Date.parse(publication.date);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 7);
  }
  return publication.date;
}

export function generateStaticParams() {
  return portfolio.publications.map((paper) => ({ slug: paper.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const publication = getPublication(slug);
  if (!publication) return {};
  const url = `${siteUrl}/publications/${publication.slug}`;
  const pdfUrl = `${siteUrl}${publication.pdfUrl}`;
  const isWorkshop = /workshop/i.test(publication.venue);
  return {
    title: publication.title,
    description: publication.gloss,
    authors: publication.authors.map((author) => ({ name: author.name })),
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: publication.title,
      description: publication.gloss,
      authors: publication.authors.map((author) => author.name),
      publishedTime: isoDate(publication),
    },
    twitter: {
      card: "summary_large_image",
      title: publication.title,
      description: publication.gloss,
    },
    other: {
      citation_title: publication.title,
      citation_author: publication.authors.map((a) => a.name),
      citation_publication_date: isoDate(publication),
      citation_pdf_url: pdfUrl,
      ...(isWorkshop
        ? { citation_conference_title: publication.venue }
        : { citation_technical_report_institution: "arXiv" }),
    },
  };
}

/**
 * Paper pages as printed-journal sheets (run-9 RUN9-ROUTES): the bare
 * centered column becomes a drawing sheet — sheet-head strip, masthead
 * double rule, serif title, full author line (Berat in accent), the real
 * first page as a FIG. plate with a press-in venue stamp, and the BibTeX as
 * a tear-off citation slip, over a title-block footer. Metadata, JSON-LD,
 * and both links are unchanged; the FIG. plate settles from a raised,
 * lifted state as it scrolls into place (PaperFigure, App Store header
 * asset transfer — settled flat under reduced motion), the stamp presses
 * in on first view, plus the signature sign-off under the citation slip
 * (draws in on first view, settled under reduced motion).
 */
export default async function PublicationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sheet = getPaperSheet(slug);
  if (!sheet) notFound();
  const { publication, index, labels } = sheet;

  const url = `${siteUrl}/publications/${publication.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: publication.title,
    description: publication.gloss,
    author: publication.authors.map((author) => ({
      "@type": "Person",
      name: author.name,
      ...(author.orcid ? { identifier: author.orcid } : {}),
    })),
    datePublished: isoDate(publication),
    publisher: {
      "@type": "Organization",
      name: publication.venue,
    },
    sameAs: publication.href,
    url,
    encoding: {
      "@type": "MediaObject",
      contentUrl: `${siteUrl}${publication.pdfUrl}`,
      encodingFormat: "application/pdf",
    },
  };

  return (
    <>
      <main
        id="main-content"
        tabIndex={-1}
        className="journey-pub-page"
        data-light-chapter="publications"
      >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="journey-sheet-head journey-pub-page-head">
        <span>Journal — {labels.plate}</span>
        <span>{publication.venue}</span>
      </div>
      <nav aria-label="Breadcrumb" className="journey-pub-page-crumb">
        <Link href="/">Berat Ercevik</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/#publications">Publications</Link>
      </nav>
      <div className="journey-pub-plate-rule" aria-hidden="true" />
      <h1 className="journey-pub-title">{publication.title}</h1>
      <p className="journey-pub-authors">
        {publication.authors.map((author, i) => (
          <span key={author.name}>
            {i > 0 ? ", " : ""}
            {author.name === "Berat Ercevik" ? (
              <span className="journey-pub-author--self">{author.name}</span>
            ) : (
              author.name
            )}
          </span>
        ))}
      </p>
      <PaperFigure
        publication={publication}
        index={index}
        figLabel={labels.fig}
      />
      <section
        aria-labelledby="abstract"
        className="journey-pub-page-section"
      >
        <h2 id="abstract" className="journey-pub-page-h2">
          Abstract
        </h2>
        <p className="journey-pub-page-abstract">{publication.gloss}</p>
      </section>
      <div className="journey-pub-page-actions">
        <PaperActionPlate
          href={publication.href}
          index={0}
          label="Read the paper"
          arrow="↗"
          arrowDirection="up-right"
        />
        <PaperActionPlate
          href={publication.pdfUrl}
          index={1}
          label="Download PDF"
          arrow="↓"
          arrowDirection="down"
          className="journey-pub-pdf-link"
        />
      </div>
      <section aria-labelledby="cite" className="journey-pub-page-section">
        <h2 id="cite" className="journey-pub-page-h2">
          Cite
        </h2>
        <div className="journey-cite-slip">
          <p className="journey-cite-slip-head" aria-hidden="true">
            Citation slip — BibTeX
          </p>
          <BibtexBlock bibtex={publication.bibtex} />
        </div>
      </section>
      <PaperSignature />
      <footer className="journey-sheet-titleblock journey-pub-titleblock">
        <div>
          <span className="journey-sheet-titleblock-label">Paper</span>
          {labels.plate}
        </div>
        <div>
          <span className="journey-sheet-titleblock-label">Venue</span>
          {publication.venue}
        </div>
        <div>
          <span className="journey-sheet-titleblock-label">Date</span>
          {publication.date}
        </div>
      </footer>
      </main>
    </>
  );
}
