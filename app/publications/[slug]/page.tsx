import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { portfolio, type Publication } from "@/data/content";

import { BibtexBlock } from "./bibtex-block";

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

export default async function PublicationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const publication = getPublication(slug);
  if (!publication) notFound();

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
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="mb-8 text-sm">
        <Link href="/" className="underline underline-offset-4">
          Berat Ercevik
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href="/#publications" className="underline underline-offset-4">
          Publications
        </Link>
      </nav>
      <p className="text-sm font-medium uppercase tracking-[0.2em] opacity-70">
        {publication.venue} · {publication.date}
      </p>
      <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl">
        {publication.title}
      </h1>
      <p className="mt-3 text-sm opacity-70">
        {publication.authors.map((author) => author.name).join(", ")}
      </p>
      <section aria-labelledby="abstract" className="mt-8">
        <h2 id="abstract" className="text-lg font-semibold">
          Abstract
        </h2>
        <p className="mt-2 leading-relaxed">{publication.gloss}</p>
      </section>
      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={publication.href}
          className="rounded border px-4 py-2 text-sm font-medium underline-offset-4 hover:underline"
        >
          Read the paper
        </a>
        <a
          href={publication.pdfUrl}
          className="rounded border px-4 py-2 text-sm font-medium underline-offset-4 hover:underline"
        >
          Download PDF
        </a>
      </div>
      <section aria-labelledby="cite" className="mt-10">
        <h2 id="cite" className="text-lg font-semibold">
          Cite
        </h2>
        <BibtexBlock bibtex={publication.bibtex} />
      </section>
    </main>
  );
}
