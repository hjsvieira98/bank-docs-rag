const STOPWORDS = new Set([
  "a",
  "about",
  "after",
  "all",
  "also",
  "am",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "doing",
  "during",
  "each",
  "for",
  "from",
  "had",
  "has",
  "have",
  "how",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "just",
  "least",
  "less",
  "many",
  "may",
  "might",
  "more",
  "most",
  "much",
  "not",
  "of",
  "off",
  "on",
  "only",
  "onto",
  "or",
  "other",
  "our",
  "out",
  "over",
  "per",
  "please",
  "shall",
  "should",
  "so",
  "some",
  "such",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "to",
  "too",
  "under",
  "very",
  "via",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "why",
  "will",
  "with",
  "within",
  "without",
  "would",
  "you",
  "your",
]);

function keepToken(token: string): boolean {
  if (/\d/.test(token)) return true;
  if (token.length < 3) return false;
  return !STOPWORDS.has(token);
}

/** Light plural folding so "fees" and "fee" land on the same term. */
export function stemToken(token: string): string {
  if (/\d/.test(token) || token.length <= 3) return token;
  if (/(ss|is|us|ness)$/.test(token)) return token;
  if (token.endsWith("s")) return token.slice(0, -1);
  return token;
}

export function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z0-9]+(?:\.[0-9]+)?/g) ?? [];
  const tokens: string[] = [];
  for (const match of matches) {
    if (!keepToken(match)) continue;
    tokens.push(stemToken(match));
  }
  return tokens;
}

export function uniqueTokens(text: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const token of tokenize(text)) {
    if (seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

export function vocabularyFromTexts(texts: Iterable<string>): string[] {
  const vocabulary = new Set<string>();
  for (const text of texts) {
    for (const token of tokenize(text)) vocabulary.add(token);
  }
  return [...vocabulary].sort();
}

/**
 * Terms that should block an answer.
 * A word of 5+ characters that never appears in the corpus is treated as
 * out of scope, and so is a question with no in-corpus content words at all.
 */
export function coverageGaps(question: string, vocabulary: ReadonlySet<string>): string[] {
  const tokens = uniqueTokens(question);
  if (tokens.length === 0) return [];
  const known = tokens.filter((token) => vocabulary.has(token));
  if (known.length === 0) return tokens;
  return tokens.filter((token) => token.length >= 5 && !vocabulary.has(token));
}

export function formatTermList(terms: string[]): string {
  const shown = terms.slice(0, 4).map((term) => `"${term}"`);
  const first = shown[0];
  if (!first) return "that term";
  if (shown.length === 1) return first;
  const last = shown[shown.length - 1];
  if (shown.length === 2) return `${first} or ${last}`;
  return `${shown.slice(0, -1).join(", ")}, or ${last}`;
}
