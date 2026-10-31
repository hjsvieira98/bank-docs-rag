import { describe, expect, it } from "vitest";
import { factHits } from "./faithfulness";

describe("factHits", () => {
  it("matches facts case-insensitively and ignores extra whitespace", () => {
    expect(
      factHits("The lock lasts  45 Calendar Days.", ["45 calendar days", "0.125%"]),
    ).toEqual([true, false]);
  });
});
