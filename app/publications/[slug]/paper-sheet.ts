import { portfolio, type Publication } from "@/data/content";
import { plateLabels } from "@/lib/plate-labels";

export type PaperSheet = {
  publication: Publication;
  index: number;
  labels: { fig: string; plate: string };
};

/**
 * The paper page's sheet identity: which publication, its plate labels
 * (FIG. 01 / PLATE 01 / 02), and its position in the journal. Pure so the
 * labels stay testable without rendering the server component.
 */
export function getPaperSheet(slug: string): PaperSheet | undefined {
  const index = portfolio.publications.findIndex(
    (paper) => paper.slug === slug,
  );
  if (index < 0) return undefined;
  const publication = portfolio.publications[index];
  return {
    publication,
    index,
    labels: plateLabels(index, portfolio.publications.length),
  };
}
