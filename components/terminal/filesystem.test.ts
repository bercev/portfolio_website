import { describe, expect, it } from "vitest";

import { portfolio } from "@/data/content";
import { roleSlug } from "@/lib/role-anchor";

import { buildFilesystem, getNode, listNames } from "./filesystem";

const HOME = ["home", "bercev"];

describe("paper files", () => {
  it("are keyed by the publication data slug, matching goto/search/anchors", () => {
    const root = buildFilesystem();
    expect(listNames(root, [...HOME, "publications"])).toEqual(
      portfolio.publications.map((p) => `${p.slug}.txt`),
    );
  });

  it("keep their contents byte-identical in shape (title, venue, gloss)", () => {
    const root = buildFilesystem();
    for (const p of portfolio.publications) {
      const node = getNode(root, [...HOME, "publications", `${p.slug}.txt`]);
      expect(node?.type).toBe("file");
      if (node?.type !== "file") continue;
      expect(node.content).toContain(`TITLE: ${p.title}`);
      expect(node.content).toContain(`VENUE: ${p.venue}`);
      expect(node.content).toContain(p.gloss);
    }
  });

  it("do not leave the old title-slugged names behind", () => {
    const root = buildFilesystem();
    const names = listNames(root, [...HOME, "publications"]);
    // Note the trailing dash: slugify strips dashes before slicing to 48,
    // so the truncated SkillOptimizer name ends mid-word on a dash.
    expect(names).not.toContain("skilloptimizer-agent-skill-optimization-through-.txt");
    expect(names).not.toContain("grokset-multi-party-human-llm-interactions-in-so.txt");
  });
});

describe("experience files", () => {
  it("are keyed by the role slug goto/search print, in portfolio order", () => {
    const root = buildFilesystem();
    expect(listNames(root, [...HOME, "experience"])).toEqual(
      portfolio.experience.map((e) => `${roleSlug(e.role)}.txt`),
    );
    expect(listNames(root, HOME)).toContain("experience");
  });

  it("carry role, organization, dates, plain-text summary, and stack", () => {
    const root = buildFilesystem();
    for (const e of portfolio.experience) {
      const node = getNode(root, [...HOME, "experience", `${roleSlug(e.role)}.txt`]);
      expect(node?.type).toBe("file");
      if (node?.type !== "file") continue;
      expect(node.content).toContain(`ROLE: ${e.role}`);
      if (e.organization) {
        expect(node.content).toContain(`ORGANIZATION: ${e.organization}`);
      }
      expect(node.content).toContain(`DATES: ${e.dates}`);
      expect(node.content).toContain(e.summary.replace(/\*\*/g, ""));
      expect(node.content).not.toContain("**");
      expect(node.content).toContain(`STACK: ${e.technologies.join(", ")}`);
    }
  });
});

describe("other files are untouched by the paper rename", () => {
  it("still lists title-slugged project files", () => {
    const root = buildFilesystem();
    const names = listNames(root, [...HOME, "projects"]);
    expect(names).toContain("vitae.txt");
    expect(names).toContain("ai-discord-chatbot.txt");
  });
});
