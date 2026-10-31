export function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function factHits(answer: string, facts: string[]): boolean[] {
  const haystack = normalizeForMatch(answer);
  return facts.map((fact) => haystack.includes(normalizeForMatch(fact)));
}
