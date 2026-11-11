import { describe, expect, it } from "vitest";

import type { ProjectCaseStudy } from "@/data/content";

import { caseDetailDelay, caseStudyDetails } from "./case-detail";

const FULL: ProjectCaseStudy = {
  problem: "P",
  decision: "D",
  rejected: "R",
  outcome: "O",
  metrics: ["M"],
  evaluation: "E",
  role: "Role",
  team: "Team",
  timeline: "T",
  didntWork: "W",
  differently: "X",
  tradeoffs: "T",
};

describe("caseDetailDelay", () => {
  it("staggers 45ms per section", () => {
    expect(caseDetailDelay(0)).toBe(0);
    expect(caseDetailDelay(2)).toBeCloseTo(0.09, 10);
  });
});

describe("caseStudyDetails", () => {
  it("orders the full section set with diagram and links", () => {
    const details = caseStudyDetails(FULL, true, true);
    expect(details.map((d) => d.key)).toEqual([
      "problem",
      "decision",
      "architecture",
      "rejected",
      "outcome",
      "evaluation",
      "snapshot",
      "didnt-work",
      "differently",
      "tradeoffs",
      "links",
    ]);
    expect(details.map((d) => d.label)).toEqual([
      "Problem",
      "Key decision",
      "Architecture",
      "Not shipped",
      "Outcome",
      "Evaluation",
      "Snapshot",
      "What didn't work",
      "What I'd do differently",
      "Trade-offs",
      "Links",
    ]);
  });

  it("closes the numbering up without a diagram or links", () => {
    const details = caseStudyDetails(FULL, false, false);
    expect(details.map((d) => d.key)).toEqual([
      "problem",
      "decision",
      "rejected",
      "outcome",
      "evaluation",
      "snapshot",
      "didnt-work",
      "differently",
      "tradeoffs",
    ]);
  });

  it("skips optional sections the project doesn't have", () => {
    const minimal: ProjectCaseStudy = {
      problem: "P",
      decision: "D",
      outcome: "O",
    };
    expect(caseStudyDetails(minimal, false, false).map((d) => d.key)).toEqual([
      "problem",
      "decision",
      "outcome",
    ]);
  });

  it("carries the prose body on prose and outcome plates", () => {
    const details = caseStudyDetails(FULL, false, false);
    expect(details.find((d) => d.key === "problem")?.text).toBe("P");
    expect(details.find((d) => d.key === "outcome")?.text).toBe("O");
    expect(details.find((d) => d.key === "rejected")?.text).toBe("R");
  });

  it("keeps the snapshot plate only when role, team, or timeline exists", () => {
    const noSnapshot: ProjectCaseStudy = {
      problem: "P",
      decision: "D",
      outcome: "O",
      didntWork: "W",
    };
    expect(caseStudyDetails(noSnapshot, false, false).map((d) => d.key)).not.toContain(
      "snapshot",
    );
    const roleOnly: ProjectCaseStudy = {
      problem: "P",
      decision: "D",
      outcome: "O",
      role: "Role",
    };
    expect(caseStudyDetails(roleOnly, false, false).map((d) => d.key)).toContain(
      "snapshot",
    );
  });
});
