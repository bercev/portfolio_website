import { describe, expect, it } from "vitest";

import { skillBinKind, skillBinSpan, skillUses } from "./skill-bins";
import type { SkillWorkEntry } from "./skill-bins";

// The real work entries, in content order (experience, then projects),
// with the real stacks from data/content.ts.
const ENTRIES: readonly SkillWorkEntry[] = [
  { name: "Stealth Startup", technologies: ["Python", "Google ADK", "GCP", "Docker"] },
  { name: "UCSC", technologies: ["Data Structures", "Algorithms"] },
  { name: "Algoverse", technologies: ["LLMs", "Python", "Hydra", "Tmux", "Runpod", "SQLite"] },
  { name: "Trustd.ai", technologies: ["React", "NextJS", "TypeScript", "MongoDB", "AWS", "Git", "SCRUM"] },
  { name: "Vitae", technologies: ["NextJS", "TypeScript", "PostgreSQL", "Docker", "Clerk"] },
  { name: "AI Discord Chatbot", technologies: ["Python", "discord.py", "Ollama", "LangChain", "AWS"] },
];

describe("skillUses", () => {
  it("files a skill under every entry whose stack lists it, in content order", () => {
    expect(skillUses("Python", ENTRIES)).toEqual([
      "Stealth Startup",
      "Algoverse",
      "AI Discord Chatbot",
    ]);
    expect(skillUses("TypeScript", ENTRIES)).toEqual(["Trustd.ai", "Vitae"]);
    expect(skillUses("Docker", ENTRIES)).toEqual(["Stealth Startup", "Vitae"]);
    expect(skillUses("AWS", ENTRIES)).toEqual(["Trustd.ai", "AI Discord Chatbot"]);
    expect(skillUses("Git", ENTRIES)).toEqual(["Trustd.ai"]);
    expect(skillUses("Data Structures", ENTRIES)).toEqual(["UCSC"]);
  });

  it("matches exactly, case-insensitively — never a substring", () => {
    expect(skillUses("python", ENTRIES)).toEqual([
      "Stealth Startup",
      "Algoverse",
      "AI Discord Chatbot",
    ]);
    expect(skillUses("Next", ENTRIES)).toEqual([]);
  });

  it("returns no uses for skills no stack lists", () => {
    expect(skillUses("Multi-agent systems", ENTRIES)).toEqual([]);
    expect(skillUses("RAG", ENTRIES)).toEqual([]);
    expect(skillUses("Vitest", ENTRIES)).toEqual([]);
  });
});

describe("skillBinSpan", () => {
  it("doubles the bin only when a skill is filed under >=2 entries", () => {
    expect(skillBinSpan(0)).toBe(1);
    expect(skillBinSpan(1)).toBe(1);
    expect(skillBinSpan(2)).toBe(2);
    expect(skillBinSpan(3)).toBe(2);
  });
});

describe("skillBinKind", () => {
  it("marks a skill with no stack entry as a loose bin", () => {
    expect(skillBinKind(0)).toBe("loose");
    expect(skillBinKind(1)).toBe("filed");
    expect(skillBinKind(3)).toBe("filed");
  });
});
