import { describe, expect, it } from "vitest";

import { getCircularItemPresentation } from "./circular-gallery";

describe("CircularGallery item presentation", () => {
  it("keeps the selected project at the front of the carousel", () => {
    expect(getCircularItemPresentation(1, 1, 3)).toEqual({
      offset: 0,
      opacity: 1,
      zIndex: 3,
    });
  });

  it("wraps neighboring projects around the shortest side", () => {
    expect(getCircularItemPresentation(2, 0, 3).offset).toBe(-1);
    expect(getCircularItemPresentation(0, 2, 3).offset).toBe(1);
  });
});
