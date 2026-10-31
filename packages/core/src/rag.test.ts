import { describe, expect, it } from "vitest";
import type { AnswerModel } from "./answer/types";
import type { EmbeddingModel } from "./embeddings/types";
import { collectAnswer, answerQuestion } from "./rag";
import { MemoryVectorStore } from "./store/memory";
import type { StoredChunk } from "./store/types";

class FixedEmbedder implements EmbeddingModel {
  readonly id = "fixed";
  readonly dimensions = 2;
  constructor(private readonly vector: Float32Array) {}
  embed(): Promise<Float32Array[]> {
    return Promise.resolve([this.vector]);
  }
}

class ScriptedModel implements AnswerModel {
  readonly id = "scripted";
  calls = 0;
  constructor(private readonly tokens: string[]) {}
  async *stream(): AsyncIterable<string> {
    this.calls += 1;
    for (const token of this.tokens) yield token;
  }
}

function chunk(text: string, vector: number[]): StoredChunk {
  return {
    id: "mortgage-terms:000",
    documentId: "mortgage-terms",
    title: "Northline Home Loan Agreement",
    product: "Home loans",
    section: "Rate lock",
    text,
    source: "mortgage-terms.md",
    page: null,
    vector: Float32Array.from(vector),
  };
}

const vocabulary = new Set(["mortgage", "rate", "lock", "outgoing", "domestic", "wire"]);

describe("answerQuestion", () => {
  it("streams a cited answer when retrieval clears the threshold", async () => {
    const model = new ScriptedModel(["45 calendar days ", "[1]"]);
    const collected = await collectAnswer(
      answerQuestion(
        {
          embeddings: new FixedEmbedder(Float32Array.from([1, 0])),
          store: new MemoryVectorStore([
            chunk(
              "A mortgage rate lock holds the interest rate for 45 calendar days.",
              [1, 0],
            ),
          ]),
          model,
          topK: 4,
          minScore: 0.2,
          vocabulary,
        },
        "How long is a mortgage rate lock?",
      ),
    );
    expect(collected.refused).toBe(false);
    expect(collected.text).toContain("45 calendar days");
    expect(collected.sources[0]?.documentId).toBe("mortgage-terms");
    expect(collected.sources[0]?.index).toBe(1);
    expect(model.calls).toBe(1);
  });

  it("refuses below the score floor without calling the model", async () => {
    const model = new ScriptedModel(["should not run"]);
    const collected = await collectAnswer(
      answerQuestion(
        {
          embeddings: new FixedEmbedder(Float32Array.from([1, 0])),
          store: new MemoryVectorStore([
            chunk("A mortgage rate lock holds the rate.", [0, 1]),
          ]),
          model,
          topK: 4,
          minScore: 0.2,
          vocabulary,
        },
        "How long is a mortgage rate lock?",
      ),
    );
    expect(collected.refused).toBe(true);
    expect(collected.text).toBe("");
    expect(collected.sources).toEqual([]);
    expect(model.calls).toBe(0);
  });

  it("refuses a nearby clause that does not mention the asked institution", async () => {
    const model = new ScriptedModel(["should not run"]);
    const collected = await collectAnswer(
      answerQuestion(
        {
          embeddings: new FixedEmbedder(Float32Array.from([1, 0])),
          store: new MemoryVectorStore([
            chunk("An outgoing domestic wire costs $25.", [1, 0]),
          ]),
          model,
          topK: 4,
          minScore: 0.2,
          vocabulary,
        },
        "What does Harbor National charge for an outgoing domestic wire?",
      ),
    );
    expect(collected.refused).toBe(true);
    expect(collected.refusalText).toContain("harbor");
    expect(model.calls).toBe(0);
  });

  it("treats the refusal sentinel as a refusal even when it is split", async () => {
    const model = new ScriptedModel(["NOT", "_IN", "_DOCS"]);
    const collected = await collectAnswer(
      answerQuestion(
        {
          embeddings: new FixedEmbedder(Float32Array.from([1, 0])),
          store: new MemoryVectorStore([
            chunk("A mortgage rate lock holds the rate.", [1, 0]),
          ]),
          model,
          topK: 4,
          minScore: 0.2,
          vocabulary,
        },
        "How long is a mortgage rate lock?",
      ),
    );
    expect(collected.refused).toBe(true);
    expect(collected.text).toBe("");
  });

  it("does not treat a sentence that merely starts with NOT as a refusal", async () => {
    const model = new ScriptedModel(["NOT", " a penalty applies."]);
    const collected = await collectAnswer(
      answerQuestion(
        {
          embeddings: new FixedEmbedder(Float32Array.from([1, 0])),
          store: new MemoryVectorStore([
            chunk("A mortgage rate lock holds the rate.", [1, 0]),
          ]),
          model,
          topK: 4,
          minScore: 0.2,
          vocabulary,
        },
        "How long is a mortgage rate lock?",
      ),
    );
    expect(collected.refused).toBe(false);
    expect(collected.text).toBe("NOT a penalty applies.");
  });
});
