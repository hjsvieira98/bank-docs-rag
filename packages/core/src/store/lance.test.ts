import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryVectorStore } from "./memory";
import { LanceVectorStore } from "./lance";
import type { StoredChunk } from "./types";

function chunk(id: string, vector: number[]): StoredChunk {
  return {
    id,
    documentId: id,
    title: id,
    product: "Test",
    section: "Section",
    text: `${id} clause`,
    source: `${id}.md`,
    page: id === "lock" ? null : 2,
    vector: Float32Array.from(vector),
  };
}

describe("LanceVectorStore", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      directories
        .splice(0)
        .map((directory) => rm(directory, { recursive: true, force: true })),
    );
  });

  it("matches the in-memory cosine ranking", async () => {
    const chunks = [
      chunk("wire", [0, 1, 0]),
      chunk("lock", [1, 0, 0]),
      chunk("partial", [0.6, 0.8, 0]),
    ];
    const directory = await mkdtemp(join(tmpdir(), "fathom-lance-"));
    directories.push(directory);
    const lance = await LanceVectorStore.create(directory, chunks);
    const memory = new MemoryVectorStore(chunks);
    const query = Float32Array.from([1, 0, 0]);
    const [lanceHit] = await lance.search(query, 3);
    const [memoryHit] = await memory.search(query, 3);
    expect(lanceHit?.id).toBe(memoryHit?.id);
    expect(lanceHit?.score).toBeCloseTo(memoryHit?.score ?? 0, 4);
    expect(lanceHit?.page).toBeNull();
    expect(await lance.count()).toBe(3);
    const documents = await lance.documents();
    expect(documents.map((document) => document.documentId).sort()).toEqual([
      "lock",
      "partial",
      "wire",
    ]);
    await lance.close();

    const reopened = await LanceVectorStore.open(directory);
    const [again] = await reopened.search(query, 1);
    expect(again?.id).toBe("lock");
    await reopened.close();
  });
});
