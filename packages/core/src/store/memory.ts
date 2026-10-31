import { cosineSimilarity } from "../vector";
import {
  toSearchHit,
  type CorpusDocument,
  type SearchHit,
  type StoredChunk,
  type VectorStore,
} from "./types";

export class MemoryVectorStore implements VectorStore {
  constructor(private readonly chunks: StoredChunk[]) {}

  search(vector: Float32Array, limit: number): Promise<SearchHit[]> {
    if (limit <= 0) return Promise.resolve([]);
    const ranked = this.chunks
      .map((chunk) => ({ chunk, score: cosineSimilarity(vector, chunk.vector) }))
      .sort(
        (left, right) =>
          right.score - left.score || left.chunk.id.localeCompare(right.chunk.id),
      );
    return Promise.resolve(
      ranked.slice(0, limit).map(({ chunk, score }) => toSearchHit(chunk, score)),
    );
  }

  count(): Promise<number> {
    return Promise.resolve(this.chunks.length);
  }

  documents(): Promise<CorpusDocument[]> {
    const seen = new Set<string>();
    const documents: CorpusDocument[] = [];
    for (const chunk of this.chunks) {
      if (seen.has(chunk.documentId)) continue;
      seen.add(chunk.documentId);
      documents.push({
        documentId: chunk.documentId,
        title: chunk.title,
        product: chunk.product,
        source: chunk.source,
      });
    }
    return Promise.resolve(documents);
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}
