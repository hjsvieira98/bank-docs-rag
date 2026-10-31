import type { SearchHit } from "./store/types";
import { formatTermList } from "./text";

export const REFUSAL_SENTINEL = "NOT_IN_DOCS";

export const EMPTY_QUESTION_REFUSAL = "Ask a question about the Northline documents.";

export const LOW_SCORE_REFUSAL =
  "I can't answer that from the Northline documents. Nothing I retrieved is close enough to the question.";

export const MODEL_REFUSAL = "I can't answer that from the Northline documents.";

export function missingTermRefusal(terms: string[]): string {
  return `I can't answer that from the Northline documents. The corpus does not mention ${formatTermList(terms)}.`;
}

export function buildSystemPrompt(): string {
  return [
    "You are Fathom, a documentation assistant for Northline Bank.",
    "Northline Bank is fictional. The only facts you may use are the numbered sources in the user message.",
    "Write a short answer in plain prose. After each claim, cite the source number in brackets, like [1].",
    `If the sources do not contain the answer, reply with exactly ${REFUSAL_SENTINEL} and nothing else.`,
    "Do not invent fees, dates, percentages, or policy terms.",
    "Do not use knowledge from outside the sources.",
  ].join("\n");
}

export function buildUserPrompt(question: string, sources: SearchHit[]): string {
  const blocks = sources.map((source, index) => {
    const location = source.page ? `page ${source.page}` : source.section;
    return `[${index + 1}] ${source.title} — ${location}\n${source.text}`;
  });
  return `Sources:\n\n${blocks.join("\n\n")}\n\nQuestion: ${question}`;
}
