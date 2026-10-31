export { AnthropicAnswerModel } from "./answer/anthropic";
export { ExtractiveAnswerModel, composeExtractiveAnswer } from "./answer/extractive";
export { createAnswerModel } from "./answer/factory";
export { OpenAIAnswerModel } from "./answer/openai";
export { readSseData } from "./answer/sse";
export type { AnswerModel, AnswerRequest } from "./answer/types";
export {
  DEFAULT_CHUNK_CHARS,
  DEFAULT_CHUNK_OVERLAP,
  chunkSections,
  markdownToSections,
  splitSectionBody,
} from "./chunk";
export type { ChunkDraft, ChunkOptions, ChunkSource, TextSection } from "./chunk";
export { DEFAULT_MIN_SCORE, DEFAULT_PORT, DEFAULT_TOP_K, loadConfig } from "./config";
export type { AnswerProviderName, AppConfig, EmbeddingProviderName } from "./config";
export {
  createEmbeddingModel,
  embeddingModelId,
  isFittable,
  loadEmbeddingModel,
} from "./embeddings/factory";
export {
  LOCAL_EMBEDDING_DIMENSIONS,
  LOCAL_EMBEDDING_ID,
  LocalEmbeddingModel,
} from "./embeddings/local";
export { OpenAIEmbeddingModel } from "./embeddings/openai";
export type { EmbeddingModel, EmbeddingState } from "./embeddings/types";
export { factHits, normalizeForMatch } from "./faithfulness";
export {
  EMPTY_QUESTION_REFUSAL,
  LOW_SCORE_REFUSAL,
  MODEL_REFUSAL,
  REFUSAL_SENTINEL,
  buildSystemPrompt,
  buildUserPrompt,
  missingTermRefusal,
} from "./prompt";
export { answerQuestion, collectAnswer, excerpt } from "./rag";
export type { AnswerEvent, AnswerSource, CollectedAnswer, RagDependencies } from "./rag";
export { LanceVectorStore } from "./store/lance";
export { MemoryVectorStore } from "./store/memory";
export type { CorpusDocument, SearchHit, StoredChunk, VectorStore } from "./store/types";
export {
  coverageGaps,
  formatTermList,
  stemToken,
  tokenize,
  uniqueTokens,
  vocabularyFromTexts,
} from "./text";
export { cosineSimilarity, l2Normalize, similarityFromCosineDistance } from "./vector";
