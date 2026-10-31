import { l2Normalize } from "../vector";
import type { EmbeddingModel } from "./types";

interface EmbeddingResponse {
  data?: Array<{ index?: number; embedding?: number[] }>;
}

export class OpenAIEmbeddingModel implements EmbeddingModel {
  readonly id: string;
  readonly dimensions: number;

  constructor(
    private readonly options: {
      apiKey: string;
      model: string;
      dimensions: number;
      fetchImpl?: typeof fetch;
    },
  ) {
    this.id = `openai:${options.model}`;
    this.dimensions = options.dimensions;
  }

  async embed(texts: string[]): Promise<Float32Array[]> {
    if (texts.length === 0) return [];
    const vectors: Float32Array[] = [];
    for (let offset = 0; offset < texts.length; offset += 64) {
      const batch = texts.slice(offset, offset + 64);
      vectors.push(...(await this.embedBatch(batch)));
    }
    return vectors;
  }

  private async embedBatch(texts: string[]): Promise<Float32Array[]> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const response = await fetchImpl("https://api.openai.com/v1/embeddings", {
      method: "POST",
      signal: AbortSignal.timeout(30_000),
      headers: {
        authorization: `Bearer ${this.options.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: this.options.model, input: texts }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `OpenAI embeddings failed (${response.status}): ${body.slice(0, 300)}`,
      );
    }
    const payload = (await response.json()) as EmbeddingResponse;
    const rows = [...(payload.data ?? [])].sort(
      (left, right) => (left.index ?? 0) - (right.index ?? 0),
    );
    if (rows.length !== texts.length) {
      throw new Error(
        `OpenAI embeddings returned ${rows.length} vectors for ${texts.length} inputs.`,
      );
    }
    return rows.map((row, index) => {
      const embedding = row.embedding;
      if (!embedding) throw new Error(`OpenAI embeddings omitted vector ${index}.`);
      if (embedding.length !== this.dimensions) {
        throw new Error(
          `Expected ${this.dimensions} dimensions from ${this.options.model}, received ${embedding.length}. Set OPENAI_EMBEDDING_DIMENSIONS to match the model.`,
        );
      }
      return l2Normalize(Float32Array.from(embedding));
    });
  }
}
