export async function* readSseData(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) yield* dataFromLine(line);
    }
  } finally {
    reader.releaseLock();
  }
  yield* dataFromLine(buffer);
}

function* dataFromLine(line: string): Generator<string> {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return;
  const data = trimmed.slice(5).trim();
  if (data) yield data;
}
