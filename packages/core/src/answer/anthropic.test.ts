import { describe, expect, it } from "vitest";
import type { SearchHit } from "../store/types";
import { AnthropicAnswerModel } from "./anthropic";

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

describe("AnthropicAnswerModel", () => {
  it("reads text deltas and ignores other events", async () => {
    const headersSeen: Headers[] = [];
    const fetchImpl: typeof fetch = async (_input, init) => {
      headersSeen.push(new Headers(init?.headers));
      const encoder = new TextEncoder();
      const events = [
        'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"$25"}}\n\n',
        'event: message_stop\ndata: {"type":"message_stop"}\n\n',
      ].join("");
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(events));
            controller.close();
          },
        }),
        { status: 200 },
      );
    };
    const model = new AnthropicAnswerModel({
      apiKey: "test-key",
      model: "claude-3-5-haiku-latest",
      fetchImpl,
    });
    let text = "";
    for await (const token of model.stream({ question: "wire", sources: [source] }))
      text += token;
    expect(text).toBe("$25");
    expect(headersSeen[0]?.get("x-api-key")).toBe("test-key");
    expect(headersSeen[0]?.get("anthropic-version")).toBe("2023-06-01");
  });
});
