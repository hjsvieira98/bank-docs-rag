import { describe, expect, it } from "vitest";
import type { SearchHit } from "../store/types";
import { OpenAIAnswerModel } from "./openai";

const source: SearchHit = {
  id: "fee:000",
  documentId: "fee-schedule",
  title: "Consumer Fee Schedule",
  product: "Fees",
  section: "Wire transfers",
  text: "An outgoing domestic wire costs $25.",
  source: "fee-schedule.md",
  page: null,
  score: 0.5,
};

describe("OpenAIAnswerModel", () => {
  it("streams text deltas and stops at [DONE]", async () => {
    let requestBody = "";
    const fetchImpl: typeof fetch = async (_input, init) => {
      requestBody = String(init?.body);
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"choices":[{"delta":{"content":"The "}}]}\n\ndata: {"choices":[{"delta":{"content":"fee"}}]}\n\ndata: [DONE]\n\n',
            ),
          );
          controller.close();
        },
      });
      return new Response(body, { status: 200 });
    };
    const model = new OpenAIAnswerModel({
      apiKey: "test-key",
      model: "gpt-4o-mini",
      fetchImpl,
    });
    let text = "";
    for await (const token of model.stream({
      question: "domestic wire",
      sources: [source],
    })) {
      text += token;
    }
    expect(text).toBe("The fee");
    const parsed = JSON.parse(requestBody) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
    };
    expect(parsed.model).toBe("gpt-4o-mini");
    expect(parsed.messages[0]?.content).toContain("NOT_IN_DOCS");
    expect(parsed.messages[1]?.content).toContain("[1]");
    expect(parsed.messages[1]?.content).toContain("outgoing domestic wire");
  });
});
