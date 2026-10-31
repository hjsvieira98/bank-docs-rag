import { describe, expect, it } from "vitest";
import { MemoryVectorStore } from "./memory";
import type { StoredChunk } from "./types";

function chunk(id: string, vector: number[]): StoredChunk {
  return {
    id,
    documentId: id,
    title: id,
    product: "Test",
    section: "Section",
    text: id,
    source: `${id}.md`,
    page: null,
    vector: Float32Array.from(vector),
  };
}

describe("MemoryVectorStore", () => {
  it("returns the nearest chunk first", async () => {
    const store = new MemoryVectorStore([
      chunk("wire", [0, 1, 0]),
      chunk("lock", [1, 0, 0]),
      chunk("partial", [0.6, 0.8, 0]),
    ]);
    const hits = await store.search(Float32Array.from([1, 0, 0]), 2);
    expect(hits.map((hit) => hit.id)).toEqual(["lock", "partial"]);
    expect(hits[0]?.score).toBeCloseTo(1, 5);
    expect(await store.count()).toBe(3);
  });
});
