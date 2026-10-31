import type { AppConfig } from "../config";
import { AnthropicAnswerModel } from "./anthropic";
import { ExtractiveAnswerModel } from "./extractive";
import { OpenAIAnswerModel } from "./openai";
import type { AnswerModel } from "./types";

export function createAnswerModel(
  config: AppConfig,
  fetchImpl?: typeof fetch,
): AnswerModel {
  if (config.llmProvider === "extractive") return new ExtractiveAnswerModel();
  if (config.llmProvider === "openai") {
    if (!config.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is required when LLM_PROVIDER=openai.");
    }
    return new OpenAIAnswerModel({
      apiKey: config.openaiApiKey,
      model: config.openaiChatModel,
      fetchImpl,
    });
  }
  if (!config.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic.");
  }
  return new AnthropicAnswerModel({
    apiKey: config.anthropicApiKey,
    model: config.anthropicChatModel,
    fetchImpl,
  });
}
