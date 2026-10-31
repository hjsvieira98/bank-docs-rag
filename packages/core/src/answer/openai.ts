import { buildSystemPrompt, buildUserPrompt } from "../prompt";
import type { AnswerModel, AnswerRequest } from "./types";
import { readSseData } from "./sse";

interface ChatChunk {
  choices?: Array<{ delta?: { content?: string | null } }>;
}

export class OpenAIAnswerModel implements AnswerModel {
  readonly id: string;

  constructor(
    private readonly options: {
      apiKey: string;
      model: string;
      fetchImpl?: typeof fetch;
    },
  ) {
    this.id = `openai:${options.model}`;
  }

  async *stream(input: AnswerRequest): AsyncIterable<string> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const response = await fetchImpl("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(60_000),
      headers: {
        authorization: `Bearer ${this.options.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.options.model,
        temperature: 0,
        stream: true,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(input.question, input.sources) },
        ],
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI chat failed (${response.status}): ${body.slice(0, 300)}`);
    }
    if (!response.body) throw new Error("OpenAI chat returned an empty body.");
    for await (const data of readSseData(response.body)) {
      if (data === "[DONE]") return;
      const payload = JSON.parse(data) as ChatChunk;
      const token = payload.choices?.[0]?.delta?.content;
      if (token) yield token;
    }
  }
}
