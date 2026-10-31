export interface StoredChunk {
  id: string;
  documentId: string;
  title: string;
  product: string;
  section: string;
  text: string;
  source: string;
  page: number | null;
  vector: Float32Array;
}

export interface SearchHit {
  id: string;
  documentId: string;
  title: string;
  product: string;
  section: string;
  text: string;
  source: string;
  page: number | null;
  score: number;
}

export interface CorpusDocument {
  documentId: string;
  title: string;
  product: string;
  source: string;
}

export interface VectorStore {
  search(vector: Float32Array, limit: number): Promise<SearchHit[]>;
  count(): Promise<number>;
  documents(): Promise<CorpusDocument[]>;
  close(): Promise<void>;
}

export function toSearchHit(chunk: StoredChunk, score: number): SearchHit {
  return {
    id: chunk.id,
    documentId: chunk.documentId,
    title: chunk.title,
    product: chunk.product,
    section: chunk.section,
    text: chunk.text,
    source: chunk.source,
    page: chunk.page,
    score,
  };
}
