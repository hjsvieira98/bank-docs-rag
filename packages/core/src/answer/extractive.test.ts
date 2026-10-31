import { describe, expect, it } from "vitest";
import type { SearchHit } from "../store/types";
import { composeExtractiveAnswer } from "./extractive";

function hit(text: string, id = "mortgage-terms:000"): SearchHit {
  return {
    id,
    documentId: "mortgage-terms",
    title: "Northline Home Loan Agreement",
    product: "Home loans",
    section: "Rate lock",
    text,
    source: "mortgage-terms.md",
    page: null,
    score: 0.8,
  };
}

describe("composeExtractiveAnswer", () => {
  it("quotes the matching sentence and cites the chunk", () => {
    const answer = composeExtractiveAnswer("How long is a mortgage rate lock?", [
      hit(
        "Rate lock\n\nA mortgage rate lock holds the interest rate for 45 calendar days from the confirmation.",
      ),
    ]);
    expect(answer).toContain("45 calendar days");
    expect(answer).toContain("[1]");
  });

  it("returns null when the passages do not share the question", () => {
    const answer = composeExtractiveAnswer("How long is a mortgage rate lock?", [
      hit(
        "An outgoing domestic wire costs $25 and nothing else is discussed here.",
        "fee:000",
      ),
    ]);
    expect(answer).toBeNull();
  });
});
