import { describe, expect, it } from "vitest";
import { summarize, type CaseResult } from "./metrics";

function result(overrides: Partial<CaseResult>): CaseResult {
  return {
    id: "case",
    question: "q",
    shouldRefuse: false,
    refused: false,
    expectedDocumentIds: ["a"],
    retrievedDocumentIds: ["a"],
    documentHit: true,
    expectedFacts: ["one", "two"],
    factHits: [true, false],
    contextHit: true,
    topScore: 0.4,
    answer: "one",
    ...overrides,
  };
}

describe("summarize", () => {
  it("keeps refusal cases out of the retrieval and faithfulness denominators", () => {
    const summary = summarize([
      result({}),
      result({
        id: "refusal",
        shouldRefuse: true,
        refused: true,
        documentHit: null,
        expectedFacts: [],
        factHits: [],
        contextHit: null,
      }),
    ]);
    expect(summary.retrievalHitRate).toBe(1);
    expect(summary.factCoverage).toBe(0.5);
    expect(summary.answerFaithfulness).toBe(0);
    expect(summary.refusalAccuracy).toBe(1);
    expect(summary.contextRecall).toBe(1);
  });
});
