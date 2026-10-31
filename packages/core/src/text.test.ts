import { describe, expect, it } from "vitest";
import { coverageGaps, stemToken, tokenize, vocabularyFromTexts } from "./text";

describe("tokenize", () => {
  it("folds plurals and drops stopwords", () => {
    expect(tokenize("The fees are $12 and the costs remain.")).toEqual([
      "fee",
      "12",
      "cost",
      "remain",
    ]);
  });

  it("keeps decimals and does not stem business", () => {
    expect(stemToken("business")).toBe("business");
    expect(tokenize("A wire costs 0.125% per business day.")).toContain("0.125");
    expect(tokenize("A wire costs 0.125% per business day.")).toContain("business");
  });
});

describe("coverageGaps", () => {
  const vocabulary = new Set(vocabularyFromTexts(["An outgoing domestic wire costs $25."]));

  it("accepts a question whose long words are in the corpus", () => {
    expect(
      coverageGaps("How much does an outgoing domestic wire cost?", vocabulary),
    ).toEqual([]);
  });

  it("flags an institution that is not in the corpus", () => {
    expect(
      coverageGaps(
        "What does Harbor National charge for an outgoing domestic wire?",
        vocabulary,
      ),
    ).toEqual(["harbor", "national", "charge"]);
  });

  it("flags a question with no in-corpus words", () => {
    expect(coverageGaps("What is the weather in Lisbon?", vocabulary)).toEqual([
      "weather",
      "lisbon",
    ]);
  });
});
