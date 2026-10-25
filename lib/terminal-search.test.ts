import { describe, expect, it } from "vitest";

import {
  SEARCH_RESULT_LIMIT,
  searchPortfolio,
  type SearchableContent,
} from "./terminal-search";

const FIXTURE: SearchableContent = {
  projects: [
    {
      title: "Vitae",
      framing: "Resume version control that cut merge conflicts 70%",
      dates: "2025",
      description: "",
      technologies: ["React", "NextJS", "TypeScript", "PostgreSQL", "Clerk"],
    },
    {
      title: "AI Discord Chatbot",
      framing: "A Discord assistant that answers from the server's own messages",
      dates: "2025",
      description: "",
      technologies: ["Python", "discord.py", "Ollama", "LangChain", "AWS"],
    },
  ],
  publications: [
    {
      slug: "skilloptimizer",
      title:
        "SkillOptimizer: Agent Skill Optimization Through Subskills Without Task Supervision",
      gloss: "",
      venue: "ICML 2026 AIWILD Workshop",
      date: "2026",
      href: "",
      pdfUrl: "",
      authors: [],
      bibtex: "",
      preview: { src: "", alt: "", width: 0, height: 0, isPlaceholder: true },
    },
    {
      slug: "grokset",
      title: "@GrokSet: A Dataset of Public Grok Conversations",
      gloss: "",
      venue: "arXiv",
      date: "2026",
      href: "",
      pdfUrl: "",
      authors: [],
      bibtex: "",
      preview: { src: "", alt: "", width: 0, height: 0, isPlaceholder: true },
    },
  ],
  skills: [
    {
      category: "AI & agents",
      items: [
        { name: "Python", note: "Discord bot + research" },
        { name: "discord.py", note: "Shipped in the Discord bot" },
        { name: "LangChain", note: "Shipped in the Discord bot" },
      ],
    },
    {
      category: "Full-stack",
      items: [
        { name: "TypeScript", note: "Shipped in Vitae" },
        { name: "NextJS", note: "Shipped in Vitae" },
      ],
    },
    {
      category: "Foundations",
      items: [
        { name: "Data Structures", note: "Tutored DSA at UC Santa Cruz" },
        { name: "Algorithms", note: "Tutored DSA at UC Santa Cruz" },
      ],
    },
  ],
};

describe("searchPortfolio", () => {
  it("matches a project by tech substring and prints its goto slug", () => {
    const hits = searchPortfolio("Postgres", FIXTURE);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      kind: "project",
      label: "Vitae",
      detail: "Resume version control that cut merge conflicts 70%",
      goto: "vitae",
    });
  });

  it("matches a paper by title and lands on the publications chapter", () => {
    const hits = searchPortfolio("GrokSet", FIXTURE);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      kind: "paper",
      label: "@GrokSet: A Dataset of Public Grok Conversations",
      goto: "publications",
    });
  });

  it("matches a paper by venue", () => {
    const hits = searchPortfolio("icml", FIXTURE);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.kind).toBe("paper");
  });

  it("matches a project by framing", () => {
    const hits = searchPortfolio("merge conflicts", FIXTURE);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.label).toBe("Vitae");
  });

  it("groups hits projects, then papers, then skills", () => {
    const hits = searchPortfolio("Discord", FIXTURE);
    expect(hits.map((h) => h.label)).toEqual([
      "AI Discord Chatbot",
      "Python",
      "discord.py",
      "LangChain",
    ]);
    expect(hits.map((h) => h.kind)).toEqual([
      "project",
      "skill",
      "skill",
      "skill",
    ]);
  });

  it("matches skills by note and lands on the skills chapter", () => {
    const hits = searchPortfolio("Tutored", FIXTURE);
    expect(hits.map((h) => h.label)).toEqual(["Data Structures", "Algorithms"]);
    expect(hits.every((h) => h.goto === "skills")).toBe(true);
  });

  it("is case-insensitive and spans kinds", () => {
    // "vitae" hits the project title AND the two "Shipped in Vitae" notes.
    expect(searchPortfolio("VITAE", FIXTURE).map((h) => h.label)).toEqual([
      "Vitae",
      "TypeScript",
      "NextJS",
    ]);
    expect(searchPortfolio("vitae", FIXTURE).map((h) => h.label)).toEqual([
      "Vitae",
      "TypeScript",
      "NextJS",
    ]);
  });

  it("returns nothing for empty or blank queries", () => {
    expect(searchPortfolio("", FIXTURE)).toEqual([]);
    expect(searchPortfolio("   ", FIXTURE)).toEqual([]);
  });

  it("returns nothing for unknown keywords and never navigates", () => {
    expect(searchPortfolio("DefinitelyNotAKeyword", FIXTURE)).toEqual([]);
  });

  it("invents no aliases: Next.js does not match the NextJS tech row", () => {
    expect(searchPortfolio("Next.js", FIXTURE)).toEqual([]);
    expect(searchPortfolio("NextJS", FIXTURE).map((h) => h.label)).toEqual([
      "Vitae",
      "NextJS",
    ]);
  });

  it("caps results at the limit", () => {
    const hits = searchPortfolio("e", FIXTURE);
    expect(hits).toHaveLength(SEARCH_RESULT_LIMIT);
  });
});
