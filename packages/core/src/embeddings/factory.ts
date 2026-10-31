import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppConfig } from "../config";
import { LOCAL_EMBEDDING_ID, LocalEmbeddingModel } from "./local";
import { OpenAIEmbeddingModel } from "./openai";
import type { EmbeddingModel, EmbeddingState } from "./types";

export function embeddingModelId(config: AppConfig): string {
  if (config.embeddingProvider === "local") return LOCAL_EMBEDDING_ID;
  return `openai:${config.openaiEmbeddingModel}`;
}

export function createEmbeddingModel(
  config: AppConfig,
  fetchImpl?: typeof fetch,
): EmbeddingModel {
  if (config.embeddingProvider === "local") return new LocalEmbeddingModel();
  if (!config.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai.");
  }
  return new OpenAIEmbeddingModel({
    apiKey: config.openaiApiKey,
    model: config.openaiEmbeddingModel,
    dimensions: config.openaiEmbeddingDimensions,
    fetchImpl,
  });
}

export async function loadEmbeddingModel(
  config: AppConfig,
  indexDir: string,
  fetchImpl?: typeof fetch,
): Promise<EmbeddingModel> {
  if (config.embeddingProvider === "openai") return createEmbeddingModel(config, fetchImpl);
  const raw = await readFile(join(indexDir, "embedding.json"), "utf8");
  return LocalEmbeddingModel.fromState(JSON.parse(raw) as EmbeddingState);
}

export function isFittable(model: EmbeddingModel): model is LocalEmbeddingModel {
  return model instanceof LocalEmbeddingModel;
}
