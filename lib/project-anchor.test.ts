import { describe, expect, it } from "vitest";

import { isProjectHash, projectAnchorId, projectSlug } from "./project-anchor";

describe("projectSlug", () => {
  it.each([
    ["Vitae", "vitae"],
    ["AI Discord Chatbot", "ai-discord-chatbot"],
    ["  Vitae! ", "vitae"],
    ["Vitae (YC)", "vitae-yc"],
  ] as const)("slugifies %p to %p", (title, expected) => {
    expect(projectSlug(title)).toBe(expected);
  });
});

describe("projectAnchorId", () => {
  it("prefixes the slug with project-", () => {
    expect(projectAnchorId("Vitae")).toBe("project-vitae");
    expect(projectAnchorId("AI Discord Chatbot")).toBe(
      "project-ai-discord-chatbot",
    );
  });
});

describe("isProjectHash", () => {
  it("matches with or without the leading #", () => {
    expect(isProjectHash("#project-vitae", "Vitae")).toBe(true);
    expect(isProjectHash("project-vitae", "Vitae")).toBe(true);
    expect(
      isProjectHash("#project-ai-discord-chatbot", "AI Discord Chatbot"),
    ).toBe(true);
  });

  it("rejects other rows, the chapter hash, and empty input", () => {
    expect(isProjectHash("#project-vitae", "AI Discord Chatbot")).toBe(false);
    expect(isProjectHash("#projects", "Vitae")).toBe(false);
    expect(isProjectHash("", "Vitae")).toBe(false);
    expect(isProjectHash("#", "Vitae")).toBe(false);
  });
});
