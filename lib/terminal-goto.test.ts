import { describe, expect, it } from "vitest";

import {
  gotoCompletionNames,
  gotoTargets,
  resolveGotoTarget,
} from "./terminal-goto";

const PROJECTS = ["Vitae", "AI Discord Chatbot"];

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
  });
});
