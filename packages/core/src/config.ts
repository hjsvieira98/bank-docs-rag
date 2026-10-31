export const DEFAULT_TOP_K = 5;
export const DEFAULT_MIN_SCORE = 0.12;
export const DEFAULT_PORT = 8787;

export type EmbeddingProviderName = "local" | "openai";
export type AnswerProviderName = "extractive" | "openai" | "anthropic";

export interface AppConfig {
  port: number;
  embeddingProvider: EmbeddingProviderName;
  openaiApiKey?: string;
  openaiEmbeddingModel: string;
  openaiEmbeddingDimensions: number;
  openaiChatModel: string;
  anthropicApiKey?: string;
  anthropicChatModel: string;
  llmProvider: AnswerProviderName;
  topK: number;
  minScore: number;
}

const EMBEDDING_PROVIDERS = new Set<EmbeddingProviderName>(["local", "openai"]);
const ANSWER_PROVIDERS = new Set<AnswerProviderName>(["extractive", "openai", "anthropic"]);

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const embeddingProvider = readEnum(
    env,
    "EMBEDDING_PROVIDER",
    "local",
    EMBEDDING_PROVIDERS,
    "local or openai",
  );
  const llmProvider = readEnum(
    env,
    "LLM_PROVIDER",
    "extractive",
    ANSWER_PROVIDERS,
    "extractive, openai, or anthropic",
  );
  return {
    port: readNumber(env, "PORT", DEFAULT_PORT),
    embeddingProvider,
    openaiApiKey: readString(env, "OPENAI_API_KEY"),
    openaiEmbeddingModel:
      readString(env, "OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small",
    openaiEmbeddingDimensions: readNumber(env, "OPENAI_EMBEDDING_DIMENSIONS", 1536),
    openaiChatModel: readString(env, "OPENAI_CHAT_MODEL") ?? "gpt-4o-mini",
    anthropicApiKey: readString(env, "ANTHROPIC_API_KEY"),
    anthropicChatModel:
      readString(env, "ANTHROPIC_CHAT_MODEL") ?? "claude-3-5-haiku-latest",
    llmProvider,
    topK: readNumber(env, "RETRIEVAL_TOP_K", DEFAULT_TOP_K),
    minScore: readNumber(env, "RETRIEVAL_MIN_SCORE", DEFAULT_MIN_SCORE),
  };
}

function readString(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = env[key];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readNumber(env: NodeJS.ProcessEnv, key: string, fallback: number): number {
  const raw = readString(env, key);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value))
    throw new Error(`${key} must be a number. Received "${raw}".`);
  return value;
}

function readEnum<T extends string>(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: T,
  allowed: ReadonlySet<T>,
  hint: string,
): T {
  const raw = readString(env, key);
  if (raw === undefined) return fallback;
  if (!allowed.has(raw as T)) {
    throw new Error(`Unknown ${key} "${raw}". Use ${hint}.`);
  }
  return raw as T;
}
