import type { MetadataRoute } from "next";

import { portfolio } from "@/data/content";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.URL ??
  "http://localhost:3000";

/**
 * Content-driven date for a publication's display date string.
 * Falls back to epoch start when unparseable so crawlers never see
 * a bogus "everything changed today" signal.
 */
function publicationDate(displayDate: string): Date {
  const parsed = Date.parse(displayDate);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  // Bare year (e.g. "2026"): assume mid-year conference season.
  const year = /^\d{4}$/.exec(displayDate.trim());
  if (year) return new Date(`${year[1]}-07-01T00:00:00Z`);
  return new Date(0);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const paperDates = portfolio.publications.map((paper) =>
    publicationDate(paper.date),
  );
  const latestContent = paperDates.reduce(
    (latest, date) => (date > latest ? date : latest),
    new Date(0),
  );

  return [
    {
      url: `${siteUrl}/`,
      lastModified: latestContent,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${siteUrl}/plain`,
      lastModified: latestContent,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...portfolio.publications.map((paper) => ({
      url: `${siteUrl}/publications/${paper.slug}`,
      lastModified: publicationDate(paper.date),
      changeFrequency: "yearly" as const,
      priority: 0.9,
    })),
  ];
}
