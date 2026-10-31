import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  it("uses offline defaults", () => {
    const config = loadConfig({});
    expect(config.llmProvider).toBe("extractive");
    expect(config.embeddingProvider).toBe("local");
    expect(config.topK).toBe(5);
    expect(config.port).toBe(8787);
  });

  it("rejects an unknown provider", () => {
    expect(() => loadConfig({ LLM_PROVIDER: "gemini" })).toThrow(/LLM_PROVIDER/);
  });

  it("reads numeric overrides", () => {
    const config = loadConfig({
      RETRIEVAL_TOP_K: "8",
      RETRIEVAL_MIN_SCORE: "0.2",
      PORT: "9000",
    });
    expect(config.topK).toBe(8);
    expect(config.minScore).toBe(0.2);
    expect(config.port).toBe(9000);
  });
});
