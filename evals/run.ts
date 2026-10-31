import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  answerQuestion,
  collectAnswer,
  createAnswerModel,
  factHits,
  loadConfig,
  normalizeForMatch,
} from "@fathom/core";
import { prepareIndex } from "@fathom/ingest";
import { dataset } from "./dataset";
import { summarize, type CaseResult, type EvalSummary } from "./metrics";

export interface EvalReport {
  embeddingModel: string;
  answerModel: string;
  topK: number;
  minScore: number;
  cases: CaseResult[];
  summary: EvalSummary;
}

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

export async function runEval(
  corpusDir = resolve(repoRoot, "corpus"),
): Promise<EvalReport> {
  const indexDir = await mkdtemp(join(tmpdir(), "fathom-eval-"));
  const config = loadConfig({ EMBEDDING_PROVIDER: "local", LLM_PROVIDER: "extractive" });
  const prepared = await prepareIndex({ corpusDir, indexDir, config, force: true });
  const model = createAnswerModel(config);
  try {
    const cases: CaseResult[] = [];
    for (const item of dataset) {
      const vectors = await prepared.embeddings.embed([item.question]);
      const vector = vectors[0];
      if (!vector) throw new Error(`No embedding for ${item.id}`);
      const hits = await prepared.store.search(vector, config.topK);
      const retrievedDocumentIds = unique(hits.map((hit) => hit.documentId));
      const retrievedText = hits.map((hit) => hit.text).join("\n");
      const collected = await collectAnswer(
        answerQuestion(
          {
            embeddings: prepared.embeddings,
            store: prepared.store,
            model,
            topK: config.topK,
            minScore: config.minScore,
            vocabulary: new Set(prepared.manifest.vocabulary),
          },
          item.question,
        ),
      );
      const hitsForFacts = factHits(collected.text, item.expectedFacts);
      cases.push({
        id: item.id,
        question: item.question,
        shouldRefuse: item.shouldRefuse,
        refused: collected.refused,
        expectedDocumentIds: item.expectedDocumentIds,
        retrievedDocumentIds,
        documentHit: item.shouldRefuse
          ? null
          : item.expectedDocumentIds.every((id) => retrievedDocumentIds.includes(id)),
        expectedFacts: item.expectedFacts,
        factHits: item.shouldRefuse ? [] : hitsForFacts,
        contextHit: item.shouldRefuse
          ? null
          : item.expectedFacts.every((fact) =>
              normalizeForMatch(retrievedText).includes(normalizeForMatch(fact)),
            ),
        topScore: hits[0]?.score ?? null,
        answer: collected.refused ? (collected.refusalText ?? "") : collected.text,
      });
    }
    return {
      embeddingModel: prepared.manifest.embeddingModel,
      answerModel: model.id,
      topK: config.topK,
      minScore: config.minScore,
      cases,
      summary: summarize(cases),
    };
  } finally {
    await prepared.store.close();
    await rm(indexDir, { recursive: true, force: true });
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function formatRate(numerator: number, denominator: number, rate: number): string {
  return `${String(numerator).padStart(2, " ")}/${denominator}  ${rate.toFixed(3)}`;
}

function printReport(report: EvalReport): void {
  console.log("Fathom offline eval");
  console.log(
    `embedding ${report.embeddingModel} · answer ${report.answerModel} · top ${report.topK} · min cosine ${report.minScore}`,
  );
  console.log("");
  for (const item of report.cases) {
    const score = item.topScore === null ? "  n/a" : item.topScore.toFixed(3);
    const status = item.shouldRefuse
      ? item.refused
        ? "refusal ok"
        : "MISSED REFUSAL"
      : item.refused
        ? "WRONG REFUSAL"
        : item.factHits.every(Boolean)
          ? "facts ok"
          : "MISSING FACTS";
    const docs = item.retrievedDocumentIds.join(",") || "-";
    console.log(`${item.id.padEnd(22)} ${status.padEnd(16)} score ${score}  docs ${docs}`);
    if (!item.shouldRefuse && item.factHits.some((hit) => !hit)) {
      const missing = item.expectedFacts.filter((_, index) => !item.factHits[index]);
      console.log(`  missing: ${missing.join(" | ")}`);
      console.log(`  answer: ${item.answer}`);
    }
  }
  const summary = report.summary;
  console.log("");
  console.log(
    `retrieval hit rate    ${formatRate(summary.retrievalHits, summary.retrievalTotal, summary.retrievalHitRate)}`,
  );
  console.log(
    `context recall        ${formatRate(summary.contextHits, summary.contextTotal, summary.contextRecall)}`,
  );
  console.log(
    `refusal accuracy      ${formatRate(summary.refusalCorrect, summary.refusalTotal, summary.refusalAccuracy)}`,
  );
  console.log(
    `fact coverage         ${formatRate(summary.factsCovered, summary.factsTotal, summary.factCoverage)}`,
  );
  console.log(
    `answer faithfulness   ${formatRate(summary.faithfulAnswers, summary.answerable, summary.answerFaithfulness)}`,
  );
}

const entry = process.argv[1] ?? "";
if (
  entry.endsWith(`${sep}evals${sep}run.ts`) ||
  entry.endsWith(`${sep}evals${sep}run.js`)
) {
  const report = await runEval();
  printReport(report);
  const summary = report.summary;
  const perfect =
    summary.retrievalHitRate === 1 &&
    summary.contextRecall === 1 &&
    summary.refusalAccuracy === 1 &&
    summary.factCoverage === 1 &&
    summary.answerFaithfulness === 1;
  process.exit(perfect ? 0 : 1);
}
