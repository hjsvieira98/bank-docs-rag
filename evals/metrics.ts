export interface CaseResult {
  id: string;
  question: string;
  shouldRefuse: boolean;
  refused: boolean;
  expectedDocumentIds: string[];
  retrievedDocumentIds: string[];
  documentHit: boolean | null;
  expectedFacts: string[];
  factHits: boolean[];
  contextHit: boolean | null;
  topScore: number | null;
  answer: string;
}

export interface EvalSummary {
  retrievalHitRate: number;
  retrievalHits: number;
  retrievalTotal: number;
  contextRecall: number;
  contextHits: number;
  contextTotal: number;
  refusalAccuracy: number;
  refusalCorrect: number;
  refusalTotal: number;
  factCoverage: number;
  factsCovered: number;
  factsTotal: number;
  answerFaithfulness: number;
  faithfulAnswers: number;
  answerable: number;
}

export function summarize(cases: CaseResult[]): EvalSummary {
  const answerable = cases.filter((item) => !item.shouldRefuse);
  const retrievalHits = answerable.filter((item) => item.documentHit).length;
  const contextHits = answerable.filter((item) => item.contextHit).length;
  const refusalCorrect = cases.filter((item) => item.refused === item.shouldRefuse).length;
  const factsTotal = answerable.reduce((sum, item) => sum + item.expectedFacts.length, 0);
  const factsCovered = answerable.reduce(
    (sum, item) => sum + item.factHits.filter(Boolean).length,
    0,
  );
  const faithfulAnswers = answerable.filter(
    (item) => !item.refused && item.factHits.every(Boolean),
  ).length;
  return {
    retrievalHitRate: ratio(retrievalHits, answerable.length),
    retrievalHits,
    retrievalTotal: answerable.length,
    contextRecall: ratio(contextHits, answerable.length),
    contextHits,
    contextTotal: answerable.length,
    refusalAccuracy: ratio(refusalCorrect, cases.length),
    refusalCorrect,
    refusalTotal: cases.length,
    factCoverage: ratio(factsCovered, factsTotal),
    factsCovered,
    factsTotal,
    answerFaithfulness: ratio(faithfulAnswers, answerable.length),
    faithfulAnswers,
    answerable: answerable.length,
  };
}

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}
