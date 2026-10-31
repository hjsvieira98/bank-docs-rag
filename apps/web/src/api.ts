export interface CorpusDocument {
  documentId: string;
  title: string;
  product: string;
  source: string;
}

export interface Health {
  ok: boolean;
  embeddingModel: string;
  answerModel: string;
  documents: number;
  chunks: number;
}

export interface Citation {
  index: number;
  id: string;
  documentId: string;
  title: string;
  product: string;
  section: string;
  source: string;
  page: number | null;
  score: number;
  excerpt: string;
}

export type ChatEvent =
  | { type: "sources"; sources: Citation[] }
  | { type: "token"; text: string }
  | { type: "refusal"; text: string }
  | { type: "done"; refused: boolean }
  | { type: "error"; message: string };

export async function streamChat(
  message: string,
  onEvent: (event: ChatEvent) => void,
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed (${response.status}).`);
  }
  if (!response.body) throw new Error("The API returned an empty stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) emitFrame(frame, onEvent);
  }
  if (buffer.trim()) emitFrame(buffer, onEvent);
}

function emitFrame(frame: string, onEvent: (event: ChatEvent) => void): void {
  const data = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");
  if (!data) return;
  onEvent(JSON.parse(data) as ChatEvent);
}

export function readerLabel(health: Health): string {
  if (health.answerModel === "extractive") return "offline reader";
  if (health.answerModel.startsWith("openai:"))
    return health.answerModel.slice("openai:".length);
  if (health.answerModel.startsWith("anthropic:")) {
    return health.answerModel.slice("anthropic:".length);
  }
  return health.answerModel;
}
