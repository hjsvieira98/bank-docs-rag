import { buildSystemPrompt, buildUserPrompt } from "../prompt";
import type { AnswerModel, AnswerRequest } from "./types";
import { readSseData } from "./sse";

interface AnthropicEvent {
  type?: string;
  delta?: { type?: string; text?: string };
  error?: { message?: string };
}

export class AnthropicAnswerModel implements AnswerModel {
  readonly id: string;

  constructor(
    private readonly options: {
      apiKey: string;
      model: string;
      fetchImpl?: typeof fetch;
    },
  ) {
    this.id = `anthropic:${options.model}`;
  }

  async *stream(input: AnswerRequest): AsyncIterable<string> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(60_000),
      headers: {
        "x-api-key": this.options.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.options.model,
        max_tokens: 800,
        temperature: 0,
        stream: true,
        system: buildSystemPrompt(),
        messages: [
          { role: "user", content: buildUserPrompt(input.question, input.sources) },
        ],
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Anthropic messages failed (${response.status}): ${body.slice(0, 300)}`,
      );
    }
    if (!response.body) throw new Error("Anthropic messages returned an empty body.");
    for await (const data of readSseData(response.body)) {
      const payload = JSON.parse(data) as AnthropicEvent;
      if (payload.type === "error") {
        throw new Error(payload.error?.message ?? "Anthropic stream failed.");
      }
      if (payload.type === "content_block_delta" && payload.delta?.type === "text_delta") {
        if (payload.delta.text) yield payload.delta.text;
      }
    }
  }
}
