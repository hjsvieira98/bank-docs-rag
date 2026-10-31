import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadConfig } from "@fathom/core";
import { prepareIndex } from "@fathom/ingest";

loadDotenv();

const root = process.cwd();
const config = loadConfig(process.env);
const force = process.argv.includes("--force");
const corpusDir = resolve(root, process.env.CORPUS_DIR ?? "corpus");
const indexDir = resolve(root, process.env.INDEX_DIR ?? "data/index");
const prepared = await prepareIndex({ corpusDir, indexDir, config, force });
await prepared.store.close();
const verb = prepared.rebuilt ? "Indexed" : "Index already current for";
console.log(
  `${verb} ${prepared.manifest.documents.length} documents and ${prepared.manifest.chunkCount} chunks with ${prepared.manifest.embeddingModel}.`,
);
