import { describe, expect, it } from "vitest";
import { OpenAIEmbeddingModel } from "./openai";

describe("OpenAIEmbeddingModel", () => {
  it("sends the bearer token and restores response order", async () => {
    const requests: Array<{ url: string; authorization: string | null; input: unknown }> =
      [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const body = JSON.parse(String(init?.body)) as { input: unknown };
      requests.push({
        url: String(input),
        authorization: new Headers(init?.headers).get("authorization"),
        input: body.input,
      });
      return new Response(
        JSON.stringify({
          data: [
            { index: 1, embedding: [0, 2] },
            { index: 0, embedding: [3, 0] },
          ],
        }),
        { status: 200 },
      );
    };
    const model = new OpenAIEmbeddingModel({
      apiKey: "test-key",
      model: "text-embedding-3-small",
      dimensions: 2,
      fetchImpl,
    });
    const vectors = await model.embed(["first", "second"]);
    expect(requests[0]).toMatchObject({
      url: "https://api.openai.com/v1/embeddings",
      authorization: "Bearer test-key",
      input: ["first", "second"],
    });
    expect(vectors[0]?.[0]).toBeCloseTo(1, 5);
    expect(vectors[1]?.[1]).toBeCloseTo(1, 5);
  });

  it("surfaces HTTP failures", async () => {
    const model = new OpenAIEmbeddingModel({
      apiKey: "test-key",
      model: "text-embedding-3-small",
      dimensions: 2,
      fetchImpl: async () => new Response("nope", { status: 401 }),
    });
    await expect(model.embed(["hello"])).rejects.toThrow(/401/);
  });
});
