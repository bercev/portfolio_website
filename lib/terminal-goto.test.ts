import { describe, expect, it } from "vitest";

import {
  gotoCompletionNames,
  gotoTargets,
  resolveGotoTarget,
} from "./terminal-goto";

const PROJECTS = ["Vitae", "AI Discord Chatbot"];
const PAPERS = [
  { slug: "skilloptimizer", label: "SkillOptimizer" },
  { slug: "grokset", label: "@GrokSet" },
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
