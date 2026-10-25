import { describe, expect, it } from "vitest";

import {
  normalizeTech,
  rowUsesSkill,
  skillHasWork,
  techKeyList,
} from "./skill-work";

describe("normalizeTech", () => {
  it("trims and lowercases", () => {
    expect(normalizeTech("  NextJS ")).toBe("nextjs");
    expect(normalizeTech("discord.py")).toBe("discord.py");
  });
});

describe("techKeyList", () => {
  it("joins normalized keys with pipes", () => {
    expect(techKeyList(["Python", "Google ADK", "GCP"])).toBe(
      "python|google adk|gcp",
    );
  });
});

describe("rowUsesSkill", () => {
  it("matches exactly, case-insensitively", () => {
    expect(rowUsesSkill(["React", "NextJS"], "nextjs")).toBe(true);
    expect(rowUsesSkill(["React", "NextJS"], "NextJS")).toBe(true);
  });

  it("never substring-matches", () => {
    expect(rowUsesSkill(["Pythonic"], "Python")).toBe(false);
    expect(rowUsesSkill(["Python"], "Py")).toBe(false);
  });

  it("rejects an empty skill name", () => {
    expect(rowUsesSkill(["Python"], "   ")).toBe(false);
  });
});

describe("skillHasWork", () => {
  const work = [
    ["Python", "Google ADK"],
    ["NextJS", "TypeScript", "PostgreSQL"],
  ];

  it("finds a skill in any entry", () => {
    expect(skillHasWork("PostgreSQL", work)).toBe(true);
    expect(skillHasWork("Vitest", work)).toBe(false);
  });
});
