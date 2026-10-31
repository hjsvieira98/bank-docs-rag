import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { Hono } from "hono";
import {
  answerQuestion,
  type AnswerModel,
  type AppConfig,
  type EmbeddingModel,
  type VectorStore,
} from "@fathom/core";
import type { IndexManifest } from "@fathom/ingest";

export interface AppRuntime {
  config: AppConfig;
  manifest: IndexManifest;
  store: VectorStore;
  embeddings: EmbeddingModel;
  model: AnswerModel;
}

export function createApp(runtime: AppRuntime, options?: { streamDelayMs?: number }) {
  const app = new Hono();
  const delayMs = options?.streamDelayMs ?? 0;
  app.use("*", cors());

  app.get("/api/health", (c) =>
    c.json({
      ok: true,
      embeddingModel: runtime.manifest.embeddingModel,
      answerModel: runtime.model.id,
      documents: runtime.manifest.documents.length,
      chunks: runtime.manifest.chunkCount,
    }),
  );

  app.get("/api/documents", (c) => c.json({ documents: runtime.manifest.documents }));

  app.post("/api/chat", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Expected a JSON body." }, 400);
    }
    const message = isRecord(body) ? body.message : undefined;
    if (typeof message !== "string" || message.trim().length === 0) {
      return c.json({ error: "message is required." }, 400);
    }
    if (message.length > 2000) {
      return c.json({ error: "message must be 2000 characters or fewer." }, 400);
    }

    return streamSSE(c, async (stream) => {
      try {
        for await (const event of answerQuestion(toDependencies(runtime), message)) {
          if (delayMs > 0 && event.type === "token") await wait(delayMs);
          await stream.writeSSE({ data: JSON.stringify(event) });
        }
      } catch (error) {
        const text = error instanceof Error ? error.message : "Unknown error";
        await stream.writeSSE({ data: JSON.stringify({ type: "error", message: text }) });
      }
    });
  });

  app.notFound((c) => c.json({ error: "Not found." }, 404));
  return app;
}

function toDependencies(runtime: AppRuntime) {
  return {
    embeddings: runtime.embeddings,
    store: runtime.store,
    model: runtime.model,
    topK: runtime.config.topK,
    minScore: runtime.config.minScore,
    vocabulary: new Set(runtime.manifest.vocabulary),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
