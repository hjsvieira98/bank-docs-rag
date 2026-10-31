import { REFUSAL_SENTINEL } from "../prompt";
import type { SearchHit } from "../store/types";
import { tokenize, uniqueTokens } from "../text";
import type { AnswerModel, AnswerRequest } from "./types";

const MIN_SENTENCE_CHARS = 24;

/**
 * Offline reader. It quotes the retrieved sentence with the strongest
 * overlap against the question and labels it with the chunk number.
 * Hosted models replace this class without changing retrieval.
 */
export class ExtractiveAnswerModel implements AnswerModel {
  readonly id = "extractive";

  async *stream(input: AnswerRequest): AsyncIterable<string> {
    const answer =
      composeExtractiveAnswer(input.question, input.sources) ?? REFUSAL_SENTINEL;
    for (const part of answer.split(/(\s+)/)) {
      if (part) yield part;
    }
  }
}

export function composeExtractiveAnswer(
  question: string,
  sources: SearchHit[],
): string | null {
  const questionTokens = new Set(uniqueTokens(question));
  if (questionTokens.size === 0 || sources.length === 0) return null;
  const minShared = questionTokens.size === 1 ? 1 : 2;
  let best: { score: number; sentence: string; cite: number } | null = null;

  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];
    if (!source) continue;
    for (const sentence of splitSentences(source.text)) {
      const score = scoreSentence(questionTokens, sentence);
      const shared = sharedCount(questionTokens, sentence);
      if (shared < minShared) continue;
      if (!best || score > best.score) {
        best = { score, sentence, cite: index + 1 };
      }
    }
  }

  if (!best) return null;
  return `${best.sentence} [${best.cite}]`;
}

function scoreSentence(questionTokens: ReadonlySet<string>, sentence: string): number {
  const tokens = tokenize(sentence);
  if (tokens.length === 0) return 0;
  const unique = new Set(tokens);
  let shared = 0;
  for (const token of questionTokens) {
    if (unique.has(token)) shared += 1;
  }
  if (shared === 0) return 0;
  let overlap = 0;
  for (const token of tokens) {
    if (questionTokens.has(token)) overlap += 1;
  }
  return shared * 3 + overlap / tokens.length;
}

function sharedCount(questionTokens: ReadonlySet<string>, sentence: string): number {
  const unique = new Set(tokenize(sentence));
  let shared = 0;
  for (const token of questionTokens) {
    if (unique.has(token)) shared += 1;
  }
  return shared;
}

function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  for (const line of text.split(/\n+/)) {
    const parts = line
      .trim()
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= MIN_SENTENCE_CHARS);
    sentences.push(...parts);
  }
  return sentences;
}
