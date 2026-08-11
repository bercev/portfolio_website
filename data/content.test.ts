import { describe, expect, it } from "vitest";
import { portfolio } from "./content";

const approvedOrder = [
  "home",
  "about",
  "publications",
  "experience",
  "projects",
  "skills",
  "contact",
];

describe("portfolio content", () => {
  it("keeps navigation in approved section order", () => {
    expect(portfolio.navigation.map((item) => item.id)).toEqual(approvedOrder);
  });

  it("gives previews only to publications", () => {
    expect(
      portfolio.publications.every((paper) =>
        paper.preview.src.startsWith("/publications/"),
      ),
    ).toBe(true);
    expect(
      portfolio.projects.every((project) => !("preview" in project)),
    ).toBe(true);
    expect(
      portfolio.experience.every((role) => !("preview" in role)),
    ).toBe(true);
  });

  it("uses only confirmed general contact links", () => {
    expect(portfolio.contact.links.map((link) => link.label)).toEqual([
      "GitHub",
      "LinkedIn",
      "Resume",
    ]);
    expect(JSON.stringify(portfolio)).not.toContain("mailto:");
  });

  it("keeps canonical publication URLs", () => {
    expect(portfolio.publications.map((paper) => paper.href)).toEqual([
      "https://openreview.net/forum?id=nZYF0aPAMP",
      "https://arxiv.org/abs/2602.21236",
    ]);
  });
});
