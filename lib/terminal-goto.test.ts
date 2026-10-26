import { describe, expect, it } from "vitest";

import {
  gotoCompletionNames,
  gotoTargets,
  resolveGotoTarget,
  skillSlug,
} from "./terminal-goto";

const PROJECTS = ["Vitae", "AI Discord Chatbot"];
const PAPERS = [
  { slug: "skilloptimizer", label: "SkillOptimizer" },
  { slug: "grokset", label: "@GrokSet" },
];
const SKILLS = ["Python", "Data Structures", "discord.py"];
const ROLES = [
  { role: "LLM Researcher", label: "LLM Researcher" },
  { role: "DSA Tutor", label: "DSA Tutor" },
];

describe("resolveGotoTarget", () => {
  it("resolves every chapter", () => {
    expect(resolveGotoTarget("home", PROJECTS)?.hash).toBe("#home");
    expect(resolveGotoTarget("about", PROJECTS)?.hash).toBe("#about");
    expect(resolveGotoTarget("publications", PROJECTS)?.hash).toBe("#publications");
    expect(resolveGotoTarget("experience", PROJECTS)?.hash).toBe("#experience");
    expect(resolveGotoTarget("projects", PROJECTS)?.hash).toBe("#projects");
    expect(resolveGotoTarget("skills", PROJECTS)?.hash).toBe("#skills");
    expect(resolveGotoTarget("contact", PROJECTS)?.hash).toBe("#contact");
  });

  it("accepts chapter aliases", () => {
    expect(resolveGotoTarget("papers", PROJECTS)?.hash).toBe("#publications");
    expect(resolveGotoTarget("work", PROJECTS)?.hash).toBe("#projects");
    expect(resolveGotoTarget("hire", PROJECTS)?.hash).toBe("#contact");
    expect(resolveGotoTarget("top", PROJECTS)?.hash).toBe("#home");
  });

  it("resolves project rows by title and by slug", () => {
    expect(resolveGotoTarget("vitae", PROJECTS)?.hash).toBe("#project-vitae");
    expect(resolveGotoTarget("AI Discord Chatbot", PROJECTS)?.hash).toBe(
      "#project-ai-discord-chatbot",
    );
    expect(resolveGotoTarget("ai-discord-chatbot", PROJECTS)?.hash).toBe(
      "#project-ai-discord-chatbot",
    );
  });

  it("is case-insensitive and tolerates a leading hash", () => {
    expect(resolveGotoTarget("SKILLS", PROJECTS)?.hash).toBe("#skills");
    expect(resolveGotoTarget("#contact", PROJECTS)?.hash).toBe("#contact");
  });

  it("returns null for unknown, empty, and partial input — never navigates", () => {
    expect(resolveGotoTarget("nowhere", PROJECTS)).toBeNull();
    expect(resolveGotoTarget("", PROJECTS)).toBeNull();
    expect(resolveGotoTarget("   ", PROJECTS)).toBeNull();
    expect(resolveGotoTarget("proj", PROJECTS)).toBeNull();
    expect(resolveGotoTarget("chatbot", PROJECTS)).toBeNull();
  });

  it("resolves paper rows by data slug, never by title", () => {
    expect(resolveGotoTarget("skilloptimizer", PROJECTS, PAPERS)?.hash).toBe(
      "#paper-skilloptimizer",
    );
    expect(resolveGotoTarget("GROKSET", PROJECTS, PAPERS)?.hash).toBe(
      "#paper-grokset",
    );
    expect(resolveGotoTarget("grokset", PROJECTS, PAPERS)?.label).toBe("@GrokSet");
    // The chapter alias still wins for the chapter target.
    expect(resolveGotoTarget("papers", PROJECTS, PAPERS)?.hash).toBe(
      "#publications",
    );
  });

  it("lists chapters then project rows, with slugs for completion", () => {
    expect(gotoTargets(PROJECTS).map((t) => t.hash)).toEqual([
      "#home",
      "#about",
      "#publications",
      "#experience",
      "#projects",
      "#skills",
      "#contact",
      "#project-vitae",
      "#project-ai-discord-chatbot",
    ]);
    expect(gotoCompletionNames(PROJECTS)).toContain("ai-discord-chatbot");
    expect(gotoTargets(PROJECTS, PAPERS).map((t) => t.hash)).toEqual([
      "#home",
      "#about",
      "#publications",
      "#experience",
      "#projects",
      "#skills",
      "#contact",
      "#project-vitae",
      "#project-ai-discord-chatbot",
      "#paper-skilloptimizer",
      "#paper-grokset",
    ]);
    expect(gotoCompletionNames(PROJECTS, PAPERS)).toContain("grokset");
  });
});

describe("skill goto targets (run-3 iter 41)", () => {
  it("slugs skill names for single-token completion", () => {
    expect(skillSlug("Data Structures")).toBe("data-structures");
    expect(skillSlug("discord.py")).toBe("discord-py");
    expect(skillSlug("Python")).toBe("python");
  });

  it("resolves skill names and slugs to #skills with the canonical name", () => {
    expect(resolveGotoTarget("python", PROJECTS, PAPERS, SKILLS)).toMatchObject({
      hash: "#skills",
      skillName: "Python",
    });
    expect(
      resolveGotoTarget("Data Structures", PROJECTS, PAPERS, SKILLS),
    ).toMatchObject({ hash: "#skills", skillName: "Data Structures" });
    expect(
      resolveGotoTarget("data-structures", PROJECTS, PAPERS, SKILLS),
    ).toMatchObject({ hash: "#skills", skillName: "Data Structures" });
    expect(
      resolveGotoTarget("discord.py", PROJECTS, PAPERS, SKILLS),
    ).toMatchObject({ hash: "#skills", skillName: "discord.py" });
    expect(
      resolveGotoTarget("DISCORD.PY", PROJECTS, PAPERS, SKILLS),
    ).toMatchObject({ hash: "#skills", skillName: "discord.py" });
  });

  it("keeps the chapter alias and rejects unknown skills", () => {
    expect(resolveGotoTarget("skills", PROJECTS, PAPERS, SKILLS)).toMatchObject({
      hash: "#skills",
    });
    expect(
      resolveGotoTarget("skills", PROJECTS, PAPERS, SKILLS)?.skillName,
    ).toBeUndefined();
    expect(resolveGotoTarget("cobol", PROJECTS, PAPERS, SKILLS)).toBeNull();
  });

  it("lists skill rows after papers, with slugs for completion", () => {
    const targets = gotoTargets(PROJECTS, PAPERS, SKILLS);
    expect(targets.slice(-3).map((t) => t.name)).toEqual([
      "python",
      "data-structures",
      "discord-py",
    ]);
    expect(targets.slice(-3).every((t) => t.hash === "#skills")).toBe(true);
    expect(targets.slice(-3).map((t) => t.skillName)).toEqual(SKILLS);
    expect(gotoCompletionNames(PROJECTS, PAPERS, SKILLS)).toContain(
      "data-structures",
    );
  });
});

describe("role goto targets (run-3 iter 42)", () => {
  it("resolves role titles and slugs to the role row", () => {
    expect(
      resolveGotoTarget("llm-researcher", PROJECTS, PAPERS, SKILLS, ROLES)
        ?.hash,
    ).toBe("#role-llm-researcher");
    expect(
      resolveGotoTarget("LLM Researcher", PROJECTS, PAPERS, SKILLS, ROLES)
        ?.hash,
    ).toBe("#role-llm-researcher");
    expect(
      resolveGotoTarget("dsa-tutor", PROJECTS, PAPERS, SKILLS, ROLES)?.hash,
    ).toBe("#role-dsa-tutor");
  });

  it("keeps the chapter alias and rejects unknown roles", () => {
    expect(
      resolveGotoTarget("experience", PROJECTS, PAPERS, SKILLS, ROLES)?.hash,
    ).toBe("#experience");
    expect(
      resolveGotoTarget("experience", PROJECTS, PAPERS, SKILLS, ROLES)?.hash,
    ).not.toBe("#role-llm-researcher");
    expect(
      resolveGotoTarget("ceo", PROJECTS, PAPERS, SKILLS, ROLES),
    ).toBeNull();
  });

  it("lists role rows after skills, with slugs for completion", () => {
    const targets = gotoTargets(PROJECTS, PAPERS, SKILLS, ROLES);
    expect(targets.slice(-2).map((t) => t.name)).toEqual([
      "llm-researcher",
      "dsa-tutor",
    ]);
    expect(targets.slice(-2).map((t) => t.hash)).toEqual([
      "#role-llm-researcher",
      "#role-dsa-tutor",
    ]);
    expect(
      gotoCompletionNames(PROJECTS, PAPERS, SKILLS, ROLES),
    ).toContain("llm-researcher");
  });
});
