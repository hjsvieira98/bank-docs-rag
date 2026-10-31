import { describe, expect, it } from "vitest";
import { cosineSimilarity } from "../vector";
import { LocalEmbeddingModel } from "./local";

describe("LocalEmbeddingModel", () => {
  const corpus = [
    "A mortgage rate lock holds the interest rate for 45 calendar days.",
    "An outgoing domestic wire costs 25 dollars.",
    "The grace period after maturity is 10 calendar days.",
  ];

  it("is deterministic, normalized, and nearer to the matching clause", async () => {
    const model = new LocalEmbeddingModel();
    model.fit(corpus);
    const first = await model.embed(["How long is a mortgage rate lock?"]);
    const second = await model.embed(["How long is a mortgage rate lock?"]);
    const query = first[0];
    const again = second[0];
    expect(query).toBeDefined();
    expect(again).toEqual(query);
    if (!query) return;
    let norm = 0;
    for (const value of query) norm += value * value;
    expect(Math.sqrt(norm)).toBeCloseTo(1, 5);

    const documents = await model.embed(corpus);
    const scores = documents.map((vector) => cosineSimilarity(query, vector));
    expect(scores[0]).toBeGreaterThan(scores[1] ?? 0);
    expect(scores[0]).toBeGreaterThan(scores[2] ?? 0);
  });

  it("round-trips IDF state", async () => {
    const model = new LocalEmbeddingModel();
    model.fit(corpus);
    const restored = LocalEmbeddingModel.fromState(model.exportState());
    const [original] = await model.embed(["rate lock"]);
    const [loaded] = await restored.embed(["rate lock"]);
    expect(loaded).toEqual(original);
  });
});
