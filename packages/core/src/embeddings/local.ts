import { tokenize } from "../text";
import { l2Normalize } from "../vector";
import type { EmbeddingModel, EmbeddingState } from "./types";

export const LOCAL_EMBEDDING_ID = "local-hash-384-v1";
export const LOCAL_EMBEDDING_DIMENSIONS = 384;

/**
 * Signed feature hashing with TF-IDF weights.
 * It is a deterministic offline embedder so ingestion, tests, and evals
 * do not need an API key. It is not a substitute for a hosted embedding model.
 */
export class LocalEmbeddingModel implements EmbeddingModel {
  readonly id = LOCAL_EMBEDDING_ID;
  readonly dimensions = LOCAL_EMBEDDING_DIMENSIONS;
  private documentCount = 0;
  private readonly documentFrequency = new Map<string, number>();

  fit(texts: string[]): void {
    this.documentFrequency.clear();
    this.documentCount = texts.length;
    for (const text of texts) {
      for (const token of new Set(tokenize(text))) {
        this.documentFrequency.set(token, (this.documentFrequency.get(token) ?? 0) + 1);
      }
    }
  }

  async embed(texts: string[]): Promise<Float32Array[]> {
    return texts.map((text) => this.embedOne(text));
  }

  exportState(): EmbeddingState {
    return {
      modelId: this.id,
      dimensions: this.dimensions,
      documentCount: this.documentCount,
      documentFrequency: Object.fromEntries(this.documentFrequency),
    };
  }

  static fromState(state: EmbeddingState): LocalEmbeddingModel {
    if (state.modelId !== LOCAL_EMBEDDING_ID) {
      throw new Error(`Unsupported embedding state "${state.modelId}".`);
    }
    if (state.dimensions !== LOCAL_EMBEDDING_DIMENSIONS) {
      throw new Error("Embedding dimensions do not match the local model.");
    }
    const model = new LocalEmbeddingModel();
    model.documentCount = state.documentCount;
    for (const [token, frequency] of Object.entries(state.documentFrequency)) {
      model.documentFrequency.set(token, frequency);
    }
    return model;
  }

  private embedOne(text: string): Float32Array {
    const tokens = tokenize(text);
    const frequencies = new Map<string, number>();
    const add = (token: string) => {
      frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    };
    for (const token of tokens) add(token);
    for (let index = 0; index < tokens.length - 1; index += 1) {
      const left = tokens[index];
      const right = tokens[index + 1];
      if (left && right) add(`${left}_${right}`);
    }

    const vector = new Float32Array(LOCAL_EMBEDDING_DIMENSIONS);
    for (const [token, count] of frequencies) {
      const idf = token.includes("_") ? 1 : this.idf(token);
      const weight = (1 + Math.log(count)) * idf;
      const slot = hashSlot(token, LOCAL_EMBEDDING_DIMENSIONS);
      vector[slot.index] = (vector[slot.index] ?? 0) + slot.sign * weight;
    }
    return l2Normalize(vector);
  }

  private idf(token: string): number {
    if (this.documentCount === 0) return 1;
    const frequency = this.documentFrequency.get(token) ?? 0;
    return Math.log((this.documentCount + 1) / (frequency + 1)) + 1;
  }
}

function fnv1a(value: string, seed: number): number {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function hashSlot(token: string, dimensions: number): { index: number; sign: number } {
  const primary = fnv1a(token, 0x81_1c_9d_c5);
  const secondary = fnv1a(token, 0x81_1c_9d_c5 ^ 0x9e_37_79_b9);
  return {
    index: primary % dimensions,
    sign: (secondary & 1) === 1 ? 1 : -1,
  };
}
