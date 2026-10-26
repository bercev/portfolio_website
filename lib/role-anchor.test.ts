import { describe, expect, it } from "vitest";

import { isRoleHash, roleAnchorId, roleSlug } from "./role-anchor";

describe("roleSlug", () => {
  it("slugs role titles for single-token completion", () => {
    expect(roleSlug("LLM Researcher")).toBe("llm-researcher");
    expect(roleSlug("AI Systems Engineer Intern")).toBe(
      "ai-systems-engineer-intern",
    );
    expect(roleSlug("DSA Tutor")).toBe("dsa-tutor");
    expect(roleSlug("SWE Intern")).toBe("swe-intern");
  });
});

describe("roleAnchorId", () => {
  it("prefixes the role slug with role-", () => {
    expect(roleAnchorId("LLM Researcher")).toBe("role-llm-researcher");
    expect(roleAnchorId("DSA Tutor")).toBe("role-dsa-tutor");
  });
});

describe("isRoleHash", () => {
  it("matches with or without the leading #", () => {
    expect(isRoleHash("#role-llm-researcher", "LLM Researcher")).toBe(true);
    expect(isRoleHash("role-dsa-tutor", "DSA Tutor")).toBe(true);
  });

  it("rejects other rows, the chapter hash, and empty input", () => {
    expect(isRoleHash("#role-dsa-tutor", "LLM Researcher")).toBe(false);
    expect(isRoleHash("#experience", "LLM Researcher")).toBe(false);
    expect(isRoleHash("", "LLM Researcher")).toBe(false);
    expect(isRoleHash("#", "LLM Researcher")).toBe(false);
  });
});
