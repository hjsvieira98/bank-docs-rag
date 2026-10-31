import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import {
  LanceVectorStore,
  chunkSections,
  createEmbeddingModel,
  embeddingModelId,
  isFittable,
  loadEmbeddingModel,
  vocabularyFromTexts,
  type AppConfig,
  type ChunkDraft,
  type CorpusDocument,
  type EmbeddingModel,
  type StoredChunk,
} from "@fathom/core";
import { loadMarkdown, type LoadedDocument } from "./markdown";
import { loadPdf } from "./pdf";

export interface IndexManifest {
  version: 1;
  embeddingModel: string;
  dimensions: number;
  corpusStamp: string;
  chunkCount: number;
  createdAt: string;
  vocabulary: string[];
  documents: CorpusDocument[];
}

export interface PreparedIndex {
  manifest: IndexManifest;
  store: LanceVectorStore;
  embeddings: EmbeddingModel;
  rebuilt: boolean;
}

const MANIFEST_FILE = "manifest.json";
const EMBEDDING_FILE = "embedding.json";

export async function loadCorpus(corpusDir: string): Promise<LoadedDocument[]> {
  const entries = (await readdir(corpusDir)).sort();
  const documents: LoadedDocument[] = [];
  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const fullPath = join(corpusDir, entry);
    if (entry.endsWith(".md")) documents.push(await loadMarkdown(fullPath, entry));
    else if (entry.endsWith(".pdf")) documents.push(await loadPdf(fullPath, corpusDir));
  }
  return documents;
}

export async function corpusStamp(corpusDir: string): Promise<string> {
  const files = await listFiles(corpusDir);
  const hash = createHash("sha256");
  for (const file of files) {
    const path = relative(corpusDir, file).split(sep).join("/");
    hash.update(path);
    hash.update(await readFile(file));
  }
  return hash.digest("hex");
}

export async function prepareIndex(options: {
  corpusDir: string;
  indexDir: string;
  config: AppConfig;
  force?: boolean;
}): Promise<PreparedIndex> {
  const stamp = await corpusStamp(options.corpusDir);
  const expectedModel = embeddingModelId(options.config);
  const existing = options.force ? null : await readManifest(options.indexDir);
  if (
    existing &&
    existing.corpusStamp === stamp &&
    existing.embeddingModel === expectedModel &&
    existing.version === 1
  ) {
    const embeddings = await loadEmbeddingModel(options.config, options.indexDir);
    const store = await LanceVectorStore.open(lanceDir(options.indexDir));
    return { manifest: existing, store, embeddings, rebuilt: false };
  }

  const embeddings = createEmbeddingModel(options.config);
  const documents = await loadCorpus(options.corpusDir);
  const drafts = documents.flatMap((document) =>
    chunkSections(
      {
        documentId: document.documentId,
        title: document.title,
        product: document.product,
        source: document.source,
      },
      document.sections,
    ),
  );
  if (drafts.length === 0) throw new Error(`No chunks produced from ${options.corpusDir}.`);
  if (isFittable(embeddings)) {
    embeddings.fit(drafts.map((draft) => draft.text));
    await writeJson(join(options.indexDir, EMBEDDING_FILE), embeddings.exportState());
  }

  const vectors = await embeddings.embed(drafts.map((draft) => draft.text));
  const stored = assignIds(drafts, vectors);
  const store = await LanceVectorStore.create(lanceDir(options.indexDir), stored);
  const manifest: IndexManifest = {
    version: 1,
    embeddingModel: embeddings.id,
    dimensions: embeddings.dimensions,
    corpusStamp: stamp,
    chunkCount: stored.length,
    createdAt: new Date().toISOString(),
    vocabulary: vocabularyFromTexts(drafts.map((draft) => draft.text)),
    documents: documents.map((document) => ({
      documentId: document.documentId,
      title: document.title,
      product: document.product,
      source: document.source,
    })),
  };
  await writeJson(join(options.indexDir, MANIFEST_FILE), manifest);
  return { manifest, store, embeddings, rebuilt: true };
}

export async function readManifest(indexDir: string): Promise<IndexManifest | null> {
  try {
    const raw = await readFile(join(indexDir, MANIFEST_FILE), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return isManifest(parsed) ? parsed : null;
  } catch (error) {
    if (isEnoent(error)) return null;
    throw error;
  }
}

function assignIds(drafts: ChunkDraft[], vectors: Float32Array[]): StoredChunk[] {
  const counts = new Map<string, number>();
  return drafts.map((draft, index) => {
    const vector = vectors[index];
    if (!vector) throw new Error(`Missing embedding for ${draft.documentId}.`);
    const next = counts.get(draft.documentId) ?? 0;
    counts.set(draft.documentId, next + 1);
    return {
      ...draft,
      id: `${draft.documentId}:${String(next).padStart(3, "0")}`,
      vector,
    };
  });
}

function lanceDir(indexDir: string): string {
  return join(indexDir, "lancedb");
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(fullPath)));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files.sort();
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function isManifest(value: unknown): value is IndexManifest {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<IndexManifest>;
  return (
    record.version === 1 &&
    typeof record.embeddingModel === "string" &&
    typeof record.corpusStamp === "string" &&
    Array.isArray(record.vocabulary) &&
    Array.isArray(record.documents)
  );
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}
