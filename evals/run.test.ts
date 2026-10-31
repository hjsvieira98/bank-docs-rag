import { describe, expect, it } from "vitest";
import { runEval } from "./run";

describe("offline eval", () => {
  it("retrieves the right documents and quotes the expected facts", async () => {
    const report = await runEval();
    expect(report.summary.retrievalHitRate).toBe(1);
    expect(report.summary.contextRecall).toBe(1);
    expect(report.summary.refusalAccuracy).toBe(1);
    expect(report.summary.factCoverage).toBe(1);
    expect(report.summary.answerFaithfulness).toBe(1);
  });
});
