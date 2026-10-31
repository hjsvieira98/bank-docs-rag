import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "@fathom/core";
import { afterEach, describe, expect, it } from "vitest";
import { loadCorpus, prepareIndex } from "./ingest";

const corpusDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../corpus");

describe("corpus ingestion", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      directories
        .splice(0)
        .map((directory) => rm(directory, { recursive: true, force: true })),
    );
  });

  it("loads the fictional markdown and the overdraft PDF", async () => {
    const documents = await loadCorpus(corpusDir);
    expect(documents.map((document) => document.documentId).sort()).toEqual([
      "cd-disclosures",
      "checking-conditions",
      "fee-schedule",
      "mortgage-terms",
      "overdraft-policy",
    ]);
    const mortgage = documents.find((document) => document.documentId === "mortgage-terms");
    expect(mortgage?.sections.map((section) => section.section)).toContain("Rate lock");
    expect(
      mortgage?.sections.some((section) => section.text.includes("45 calendar days")),
    ).toBe(true);
    const overdraft = documents.find(
      (document) => document.documentId === "overdraft-policy",
    );
    const text = overdraft?.sections.map((section) => section.text).join(" ") ?? "";
    expect(text).toContain("$35");
    expect(text).toContain("3 overdraft fees");
    expect(text).toContain("$50 or less");
    expect(overdraft?.sections[0]?.page).toBe(1);
  });

  it("builds a LanceDB index that retrieves the rate-lock clause", async () => {
    const indexDir = await mkdtemp(join(tmpdir(), "fathom-ingest-"));
    directories.push(indexDir);
    const prepared = await prepareIndex({
      corpusDir,
      indexDir,
      config: loadConfig({}),
      force: true,
    });
    expect(prepared.rebuilt).toBe(true);
    expect(prepared.manifest.documents).toHaveLength(5);
    expect(prepared.manifest.vocabulary).toContain("mortgage");
    const [vector] = await prepared.embeddings.embed(["How long is a mortgage rate lock?"]);
    if (!vector) throw new Error("missing vector");
    const hits = await prepared.store.search(vector, 3);
    expect(hits[0]?.documentId).toBe("mortgage-terms");
    expect(hits[0]?.text).toContain("45 calendar days");
    await prepared.store.close();

    const again = await prepareIndex({ corpusDir, indexDir, config: loadConfig({}) });
    expect(again.rebuilt).toBe(false);
    await again.store.close();
  });
});
