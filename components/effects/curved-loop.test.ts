import { describe, expect, it } from "vitest";

import { formatCurvedSkillText } from "./curved-loop";

describe("CurvedLoop skill text", () => {
  it("keeps category and skill names readable in the marquee", () => {
    expect(
      formatCurvedSkillText({
        category: "Systems",
        items: ["Concurrency", "Distributed Systems"],
      }),
    ).toBe("Systems  •  Concurrency  •  Distributed Systems  ✦");
  });
});
