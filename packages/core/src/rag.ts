import type { AnswerModel } from "./answer/types";
import type { EmbeddingModel } from "./embeddings/types";
import {
  EMPTY_QUESTION_REFUSAL,
  LOW_SCORE_REFUSAL,
  MODEL_REFUSAL,
  REFUSAL_SENTINEL,
  missingTermRefusal,
} from "./prompt";
import type { SearchHit, VectorStore } from "./store/types";
import { coverageGaps, uniqueTokens } from "./text";

export interface AnswerSource {
  index: number;
  id: string;
  documentId: string;
  title: string;
  product: string;
  section: string;
  source: string;
  page: number | null;
  score: number;
  excerpt: string;
}

export type AnswerEvent =
  | { type: "sources"; sources: AnswerSource[] }
  | { type: "token"; text: string }
  | { type: "refusal"; text: string }
  | { type: "done"; refused: boolean };

export interface RagDependencies {
  embeddings: EmbeddingModel;
  store: VectorStore;
  model: AnswerModel;
  topK: number;
  minScore: number;
  vocabulary: ReadonlySet<string>;
}

export interface CollectedAnswer {
  text: string;
  sources: AnswerSource[];
  refused: boolean;
  refusalText: string | null;
}

export async function* answerQuestion(
  dependencies: RagDependencies,
  question: string,
): AsyncGenerator<AnswerEvent> {
  const trimmed = question.trim();
  if (!trimmed || uniqueTokens(trimmed).length === 0) {
    yield* refuse(EMPTY_QUESTION_REFUSAL);
    return;
  }

  const gaps = coverageGaps(trimmed, dependencies.vocabulary);
  if (gaps.length > 0) {
    yield* refuse(missingTermRefusal(gaps));
    return;
  }

  const vectors = await dependencies.embeddings.embed([trimmed]);
  const vector = vectors[0];
  if (!vector) throw new Error("Embedding model returned no vector.");

  const hits = await dependencies.store.search(vector, dependencies.topK);
  const best = hits[0];
  if (!best || best.score < dependencies.minScore) {
    yield* refuse(LOW_SCORE_REFUSAL);
    return;
  }

  yield {
    type: "sources",
    sources: hits.map((hit, index) => toAnswerSource(hit, index + 1)),
  };

  let pending = "";
  let mode: "hold" | "answer" | "refusal" = "hold";
  for await (const token of dependencies.model.stream({
    question: trimmed,
    sources: hits,
  })) {
    if (mode === "refusal") continue;
    if (mode === "answer") {
      yield { type: "token", text: token };
      continue;
    }
    pending += token;
    const decision = classifyHold(pending);
    if (decision === "hold") continue;
    if (decision === "refusal") {
      mode = "refusal";
      yield { type: "refusal", text: MODEL_REFUSAL };
      continue;
    }
    mode = "answer";
    yield { type: "token", text: pending };
    pending = "";
  }

  if (mode === "hold") {
    if (isRefusalText(pending) || pending.trim() === "") {
      yield { type: "refusal", text: MODEL_REFUSAL };
      yield { type: "done", refused: true };
      return;
    }
    yield { type: "token", text: pending };
    mode = "answer";
  }

  yield { type: "done", refused: mode === "refusal" };
}

export async function collectAnswer(
  events: AsyncIterable<AnswerEvent>,
): Promise<CollectedAnswer> {
  let text = "";
  let sources: AnswerSource[] = [];
  let refused = false;
  let refusalText: string | null = null;
  for await (const event of events) {
    if (event.type === "sources") sources = event.sources;
    else if (event.type === "token") text += event.text;
    else if (event.type === "refusal") {
      refused = true;
      refusalText = event.text;
    } else if (event.type === "done") refused = event.refused;
  }
  return { text: text.trim(), sources, refused, refusalText };
}

function toAnswerSource(hit: SearchHit, index: number): AnswerSource {
  return {
    index,
    id: hit.id,
    documentId: hit.documentId,
    title: hit.title,
    product: hit.product,
    section: hit.section,
    source: hit.source,
    page: hit.page,
    score: hit.score,
    excerpt: excerpt(hit.text),
  };
}

export function excerpt(text: string, max = 700): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;
  return `${collapsed.slice(0, max - 1).trimEnd()}…`;
}

async function* refuse(text: string): AsyncGenerator<AnswerEvent> {
  yield { type: "sources", sources: [] };
  yield { type: "refusal", text };
  yield { type: "done", refused: true };
}

function classifyHold(pending: string): "hold" | "refusal" | "answer" {
  const folded = compact(pending);
  if (folded === REFUSAL_SENTINEL) return "refusal";
  if (REFUSAL_SENTINEL.startsWith(folded)) return "hold";
  return "answer";
}

function isRefusalText(value: string): boolean {
  return compact(value) === REFUSAL_SENTINEL;
}

function compact(value: string): string {
  return value.replace(/\s+/g, "").replace(/[.!]+$/g, "");
}
