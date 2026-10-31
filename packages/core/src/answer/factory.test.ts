import { describe, expect, it } from "vitest";
import { loadConfig } from "../config";
import { createAnswerModel } from "./factory";
import { createEmbeddingModel } from "../embeddings/factory";

describe("provider factories", () => {
  it("defaults to the offline stack", () => {
    const config = loadConfig({});
    expect(createAnswerModel(config).id).toBe("extractive");
    expect(createEmbeddingModel(config).id).toBe("local-hash-384-v1");
  });

  it("requires keys before constructing hosted clients", () => {
    const openai = loadConfig({ LLM_PROVIDER: "openai", EMBEDDING_PROVIDER: "openai" });
    expect(() => createAnswerModel(openai)).toThrow(/OPENAI_API_KEY/);
    expect(() => createEmbeddingModel(openai)).toThrow(/OPENAI_API_KEY/);
    const anthropic = loadConfig({ LLM_PROVIDER: "anthropic" });
    expect(() => createAnswerModel(anthropic)).toThrow(/ANTHROPIC_API_KEY/);
  });
});
