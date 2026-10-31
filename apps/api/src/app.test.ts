import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAnswerModel, loadConfig } from "@fathom/core";
import { prepareIndex } from "@fathom/ingest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp, type AppRuntime } from "./app";

const corpusDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../corpus");

describe("HTTP API", () => {
  let runtime: AppRuntime;
  let indexDir = "";

  beforeAll(async () => {
    indexDir = await mkdtemp(join(tmpdir(), "fathom-api-"));
    const config = loadConfig({});
    const prepared = await prepareIndex({ corpusDir, indexDir, config, force: true });
    runtime = {
      config,
      manifest: prepared.manifest,
      store: prepared.store,
      embeddings: prepared.embeddings,
      model: createAnswerModel(config),
    };
  });

  afterAll(async () => {
    await runtime.store.close();
    await rm(indexDir, { recursive: true, force: true });
  });

  it("reports the indexed corpus", async () => {
    const app = createApp(runtime);
    const response = await app.request("/api/health");
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      documents: number;
      chunks: number;
      answerModel: string;
    };
    expect(body.documents).toBe(5);
    expect(body.chunks).toBeGreaterThan(10);
    expect(body.answerModel).toBe("extractive");
  });

  it("streams a cited answer", async () => {
    const app = createApp(runtime);
    const response = await app.request("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "How long is a mortgage rate lock?" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const events = parseSse(await response.text());
    const tokens = events
      .filter((event) => event.type === "token")
      .map((event) => String(event.text ?? ""))
      .join("");
    expect(tokens).toContain("45 calendar days");
    expect(tokens).toContain("[1]");
    const sources = events.find((event) => event.type === "sources");
    const cited = (sources?.sources as Array<{ documentId: string }> | undefined) ?? [];
    expect(cited.some((source) => source.documentId === "mortgage-terms")).toBe(true);
    expect(events.at(-1)?.type).toBe("done");
  });

  it("refuses a question the corpus does not cover", async () => {
    const app = createApp(runtime);
    const response = await app.request("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "What does Harbor National charge for an outgoing domestic wire?",
      }),
    });
    const events = parseSse(await response.text());
    expect(events.some((event) => event.type === "refusal")).toBe(true);
    const done = events.find((event) => event.type === "done");
    expect(done?.refused).toBe(true);
  });

  it("rejects an empty message", async () => {
    const app = createApp(runtime);
    const response = await app.request("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
  });
});

function parseSse(body: string): Array<Record<string, unknown>> {
  return body
    .split("\n\n")
    .map((frame) => frame.split("\n").find((line) => line.startsWith("data:")))
    .filter((line): line is string => Boolean(line))
    .map((line) => JSON.parse(line.slice(5).trim()) as Record<string, unknown>);
}
