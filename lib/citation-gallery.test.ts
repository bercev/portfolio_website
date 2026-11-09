import { describe, expect, it } from "vitest";

import type { Publication } from "@/data/content";
import {
  CITATION_GALLERY_PRESS_SCALE,
  CITATION_GALLERY_SPRING,
  CITATION_GALLERY_STAGGER_MS,
  citationCardNumber,
  citationGalleryCards,
  citationGalleryDelay,
  citationGalleryStatus,
  citationVenueLabel,
} from "./citation-gallery";

const skilloptimizer = {
  slug: "skilloptimizer",
  href: "https://openreview.net/forum?id=nZYF0aPAMP",
  pdfUrl: "/assets/publications/skilloptimizer.pdf",
} as Publication;

const grokset = {
  slug: "grokset",
  href: "https://arxiv.org/abs/2602.21236",
  pdfUrl: "/assets/publications/grokset.pdf",
} as Publication;

describe("citationVenueLabel", () => {
  it("derives the venue label from the link's own host", () => {
    expect(citationVenueLabel(skilloptimizer.href)).toBe("OPENREVIEW");
    expect(citationVenueLabel(grokset.href)).toBe("ARXIV");
    expect(citationVenueLabel("https://example.com/paper")).toBe("SOURCE");
    expect(citationVenueLabel("not a url")).toBe("SOURCE");
  });
});

describe("citationGalleryCards", () => {
  it("fans the paper's four real links, in gallery order", () => {
    const cards = citationGalleryCards(skilloptimizer);
    expect(cards.map((card) => card.key)).toEqual([
      "venue",
      "pdf",
      "paper",
      "bibtex",
    ]);
    expect(cards[0]).toEqual({
      key: "venue",
      label: "OPENREVIEW",
      kind: "link",
      href: "https://openreview.net/forum?id=nZYF0aPAMP",
    });
    expect(cards[1]).toEqual({
      key: "pdf",
      label: "PDF",
      kind: "link",
      href: "/assets/publications/skilloptimizer.pdf",
    });
    expect(cards[2]).toEqual({
      key: "paper",
      label: "PAPER",
      kind: "link",
      href: "/publications/skilloptimizer",
    });
    expect(cards[3]).toEqual({ key: "bibtex", label: "BIBTEX", kind: "copy" });
  });

  it("labels the arXiv paper's venue link ARXIV", () => {
    const cards = citationGalleryCards(grokset);
    expect(cards[0].label).toBe("ARXIV");
    expect(cards[2].href).toBe("/publications/grokset");
  });
});

describe("citationCardNumber", () => {
  it("numbers the cards 1-based and zero-padded", () => {
    expect(citationCardNumber(0)).toBe("01");
    expect(citationCardNumber(3)).toBe("04");
  });
});

describe("citationGalleryDelay", () => {
  it("staggers the cards ~80ms apart", () => {
    expect(citationGalleryDelay(0)).toBeCloseTo(0, 10);
    expect(citationGalleryDelay(1)).toBeCloseTo(0.08, 10);
    expect(citationGalleryDelay(3)).toBeCloseTo(0.24, 10);
  });
});

describe("citationGalleryStatus", () => {
  it("prints the ticket count and the venue above the strip", () => {
    expect(
      citationGalleryStatus(4, "ICML 2026 AIWILD Workshop"),
    ).toBe("PRINTED — 04 TICKETS · ICML 2026 AIWILD WORKSHOP");
  });
});

describe("CITATION_GALLERY_STAGGER_MS", () => {
  it("is the ~80ms CRED shuffle stagger", () => {
    expect(CITATION_GALLERY_STAGGER_MS).toBe(80);
  });
});

describe("CITATION_GALLERY_PRESS_SCALE", () => {
  it("is the reel-4 press scale", () => {
    expect(CITATION_GALLERY_PRESS_SCALE).toBe(0.97);
  });
});

describe("CITATION_GALLERY_SPRING", () => {
  it("is the stiff epilogue-pop spring", () => {
    expect(CITATION_GALLERY_SPRING.stiffness).toBe(300);
    expect(CITATION_GALLERY_SPRING.damping).toBe(18);
  });
});
