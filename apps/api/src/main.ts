import { serve } from "@hono/node-server";
import { createAnswerModel, loadConfig } from "@fathom/core";
import { prepareIndex } from "@fathom/ingest";
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
loadDotenv({ path: resolve(repoRoot, ".env") });

const config = loadConfig(process.env);
const corpusDir = resolve(repoRoot, process.env.CORPUS_DIR ?? "corpus");
const indexDir = resolve(repoRoot, process.env.INDEX_DIR ?? "data/index");
const prepared = await prepareIndex({ corpusDir, indexDir, config });
const model = createAnswerModel(config);
const app = createApp(
  {
    config,
    manifest: prepared.manifest,
    store: prepared.store,
    embeddings: prepared.embeddings,
    model,
  },
  { streamDelayMs: numberFrom(process.env.STREAM_DELAY_MS) },
);

serve({ fetch: app.fetch, hostname: "127.0.0.1", port: config.port }, (info) => {
  console.log(`Fathom API http://127.0.0.1:${info.port}`);
  console.log(
    `${prepared.rebuilt ? "Indexed" : "Reused"} ${prepared.manifest.documents.length} documents, ${prepared.manifest.chunkCount} chunks (${prepared.manifest.embeddingModel}, ${model.id}).`,
  );
});

function numberFrom(value: string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
