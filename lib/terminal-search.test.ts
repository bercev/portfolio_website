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
  experience: [
    {
      role: "LLM Researcher",
      organization: "Algoverse",
      dates: "Jun 2025-Jan 2026",
      summary:
        "Built and analyzed a large dataset of public chatbot conversations and cut collection cost",
      technologies: ["LLMs", "Python"],
    },
    {
      role: "DSA Tutor",
      organization: "UCSC",
      dates: "Apr 2025-Jun 2026",
      summary:
        "Supported upper-division students through office hours and project guidance",
      technologies: ["Data Structures", "Algorithms"],
    },
    {
      role: "SWE Intern",
      organization: "Trustd.ai",
      dates: "Oct 2024-Feb 2025",
      summary:
        "Shipped admin workflows with validation and hardened CI/CD pipelines",
      technologies: ["React", "TypeScript"],
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

  it("matches a paper by title and prints its goto data slug", () => {
    const hits = searchPortfolio("GrokSet", FIXTURE);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      kind: "paper",
      label: "@GrokSet: A Dataset of Public Grok Conversations",
      goto: "grokset",
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

  it("matches skills by note and prints per-skill goto slugs", () => {
    const hits = searchPortfolio("Tutored", FIXTURE);
    expect(hits.map((h) => h.label)).toEqual(["Data Structures", "Algorithms"]);
    expect(hits.map((h) => h.goto)).toEqual([
      "data-structures",
      "algorithms",
    ]);
  });

  it("prints the skill slug a goto command can land on", () => {
    const skillHits = searchPortfolio("Python", FIXTURE).filter(
      (h) => h.kind === "skill",
    );
    expect(skillHits).toHaveLength(1);
    expect(skillHits[0]).toMatchObject({ label: "Python", goto: "python" });
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

  it("matches a role by organization and lands on the role row", () => {
    const hits = searchPortfolio("Algoverse", FIXTURE);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      kind: "experience",
      label: "LLM Researcher",
      detail: "Algoverse (Jun 2025-Jan 2026)",
      goto: "llm-researcher",
    });
  });

  it("matches a role by summary keyword and by title", () => {
    expect(searchPortfolio("validation", FIXTURE).map((h) => h.label)).toEqual([
      "SWE Intern",
    ]);
    // "tutor" also matches the "Tutored DSA" skill notes — skills sort first.
    expect(searchPortfolio("TUTOR", FIXTURE).map((h) => h.label)).toEqual([
      "Data Structures",
      "Algorithms",
      "DSA Tutor",
    ]);
  });

  it("sorts roles after skills, keeping the iter-20 kind order stable", () => {
    const hits = searchPortfolio("Python", FIXTURE);
    expect(hits.map((h) => h.label)).toEqual([
      "AI Discord Chatbot",
      "Python",
      "LLM Researcher",
    ]);
    expect(hits.map((h) => h.kind)).toEqual([
      "project",
      "skill",
      "experience",
    ]);
  });

  it("caps results at the limit", () => {
    const hits = searchPortfolio("e", FIXTURE);
    expect(hits).toHaveLength(SEARCH_RESULT_LIMIT);
  });
});
