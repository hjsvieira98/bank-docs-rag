import { mkdir } from "node:fs/promises";
import * as lancedb from "@lancedb/lancedb";
import { similarityFromCosineDistance } from "../vector";
import type { CorpusDocument, SearchHit, StoredChunk, VectorStore } from "./types";

type LanceConnection = Awaited<ReturnType<typeof lancedb.connect>>;
type LanceTable = Awaited<ReturnType<LanceConnection["openTable"]>>;

interface LanceHit {
  id: string;
  documentId: string;
  title: string;
  product: string;
  section: string;
  text: string;
  source: string;
  page: number;
  _distance?: number;
}

const TABLE_NAME = "chunks";

interface CosineQuery {
  distanceType(metric: "cosine"): {
    limit(count: number): { toArray(): Promise<LanceHit[]> };
  };
}

export class LanceVectorStore implements VectorStore {
  private constructor(
    private readonly connection: LanceConnection,
    private readonly table: LanceTable,
  ) {}

  static async create(directory: string, chunks: StoredChunk[]): Promise<LanceVectorStore> {
    if (chunks.length === 0)
      throw new Error("Cannot create a LanceDB index with no chunks.");
    await mkdir(directory, { recursive: true });
    const connection = await lancedb.connect(directory);
    const table = await connection.createTable(TABLE_NAME, chunks.map(toLanceRow), {
      mode: "overwrite",
    });
    return new LanceVectorStore(connection, table);
  }

  static async open(directory: string): Promise<LanceVectorStore> {
    const connection = await lancedb.connect(directory);
    const table = await connection.openTable(TABLE_NAME);
    return new LanceVectorStore(connection, table);
  }

  async search(vector: Float32Array, limit: number): Promise<SearchHit[]> {
    if (limit <= 0) return [];
    const search = this.table.search(Array.from(vector)) as CosineQuery;
    const rows = await search.distanceType("cosine").limit(limit).toArray();
    return rows.map((row) => ({
      id: row.id,
      documentId: row.documentId,
      title: row.title,
      product: row.product,
      section: row.section,
      text: row.text,
      source: row.source,
      page: row.page > 0 ? row.page : null,
      score: similarityFromCosineDistance(row._distance ?? 1),
    }));
  }

  async count(): Promise<number> {
    return this.table.countRows();
  }

  async documents(): Promise<CorpusDocument[]> {
    const rows = (await this.table
      .query()
      .select(["documentId", "title", "product", "source"])
      .toArray()) as Array<Pick<LanceHit, "documentId" | "title" | "product" | "source">>;
    const seen = new Set<string>();
    const documents: CorpusDocument[] = [];
    for (const row of rows) {
      if (seen.has(row.documentId)) continue;
      seen.add(row.documentId);
      documents.push(row);
    }
    return documents;
  }

  async close(): Promise<void> {
    this.table.close();
    this.connection.close();
  }
}

function toLanceRow(chunk: StoredChunk): Record<string, unknown> {
  return {
    id: chunk.id,
    documentId: chunk.documentId,
    title: chunk.title,
    product: chunk.product,
    section: chunk.section,
    text: chunk.text,
    source: chunk.source,
    page: chunk.page ?? -1,
    vector: Array.from(chunk.vector),
  };
}
