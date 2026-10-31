import { describe, expect, it } from "vitest";
import { readSseData } from "./sse";

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe("readSseData", () => {
  it("reassembles data lines split across chunks", async () => {
    const body = streamFrom(["data: one\n\ndata: tw", "o\n\n"]);
    const values: string[] = [];
    for await (const value of readSseData(body)) values.push(value);
    expect(values).toEqual(["one", "two"]);
  });
});
