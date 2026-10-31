import { useEffect, useRef, useState } from "react";
import {
  readerLabel,
  streamChat,
  type ChatEvent,
  type Citation,
  type CorpusDocument,
  type Health,
} from "./api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources: Citation[];
  refused: boolean;
  pending: boolean;
  error: boolean;
}

const suggestions: Array<{ text: string; scope: "in" | "out" }> = [
  { text: "How long is a mortgage rate lock?", scope: "in" },
  { text: "How is the Everyday Checking monthly fee waived?", scope: "in" },
  { text: "How much does an outgoing domestic wire cost?", scope: "in" },
  { text: "I am overdrawn by $40. Will Northline charge an overdraft fee?", scope: "in" },
  {
    text: "What does Harbor National charge for an outgoing domestic wire?",
    scope: "out",
  },
];

export function App() {
  const [documents, setDocuments] = useState<CorpusDocument[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [activeCite, setActiveCite] = useState<number | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      for (let attempt = 0; attempt < 20 && !cancelled; attempt += 1) {
        try {
          const [healthResponse, docsResponse] = await Promise.all([
            fetch("/api/health"),
            fetch("/api/documents"),
          ]);
          if (!healthResponse.ok || !docsResponse.ok) throw new Error("not ready");
          const healthJson = (await healthResponse.json()) as Health;
          const docsJson = (await docsResponse.json()) as { documents: CorpusDocument[] };
          if (cancelled) return;
          setHealth(healthJson);
          setDocuments(docsJson.documents);
          setBootError(null);
          return;
        } catch {
          await wait(400);
        }
      }
      if (!cancelled) {
        setBootError("The index API is not running. From the repo root, run npm run dev.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
  }, [messages]);

  const focused = messages.find(
    (message) => message.id === focusedId && message.role === "assistant",
  );

  async function ask(question: string) {
    const text = question.trim();
    if (!text || pending) return;
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    setDraft("");
    setPending(true);
    setFocusedId(assistantId);
    setActiveCite(null);
    setMessages((current) => [
      ...current,
      {
        id: userId,
        role: "user",
        text,
        sources: [],
        refused: false,
        pending: false,
        error: false,
      },
      {
        id: assistantId,
        role: "assistant",
        text: "",
        sources: [],
        refused: false,
        pending: true,
        error: false,
      },
    ]);

    const apply = (update: (message: ChatMessage) => ChatMessage) => {
      setMessages((current) =>
        current.map((message) => (message.id === assistantId ? update(message) : message)),
      );
    };

    try {
      await streamChat(text, (event) => apply((message) => reduceEvent(message, event)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "The request failed.";
      apply((current) => ({ ...current, text: message, error: true, pending: false }));
    } finally {
      setPending(false);
      apply((current) => ({ ...current, pending: false }));
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mark" aria-hidden="true">
            F
          </span>
          <div>
            <p className="wordmark">Fathom</p>
            <p className="tag">Northline document desk</p>
          </div>
        </div>
        <p className="synthetic">Synthetic corpus · not a bank</p>
      </header>

      <div className="shell">
        <aside className="rail">
          <p className="eyebrow">Bound volume</p>
          <h2>Documents</h2>
          {documents.length === 0 ? (
            <p className="muted">Waiting for the index…</p>
          ) : (
            <ol className="docs">
              {documents.map((document, index) => (
                <li key={document.documentId}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <em>{document.product}</em>
                    <strong>{document.title}</strong>
                    <small>{document.source}</small>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className="credit">Built by Humberto Vieira</p>
        </aside>

        <main className="conversation">
          <p className="status">
            {health
              ? `${health.documents} documents · ${health.chunks} passages · ${readerLabel(health)}`
              : "Connecting to the index…"}
          </p>
          {bootError ? <p className="banner">{bootError}</p> : null}
          <div className="transcript" ref={transcriptRef}>
            {messages.length === 0 ? (
              <div className="hero">
                <p className="eyebrow">Ask the clause</p>
                <h2>
                  Answers stay inside the Northline documents, and every claim points at the
                  passage.
                </h2>
                <div className="chips">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.text}
                      type="button"
                      className={suggestion.scope === "out" ? "chip out" : "chip"}
                      onClick={() => void ask(suggestion.text)}
                    >
                      {suggestion.scope === "out" ? "Out of scope · " : ""}
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="thread">
                {messages.map((message) =>
                  message.role === "user" ? (
                    <p key={message.id} className="user">
                      {message.text}
                    </p>
                  ) : (
                    <article
                      key={message.id}
                      className={message.refused ? "assistant refusal" : "assistant"}
                      aria-busy={message.pending}
                    >
                      {message.pending && message.text === "" && !message.refused ? (
                        <span className="caret" aria-hidden="true" />
                      ) : null}
                      {message.refused || message.error ? (
                        message.text
                      ) : (
                        <AnswerText
                          text={message.text}
                          active={focusedId === message.id ? activeCite : null}
                          onCite={(index) => {
                            setFocusedId(message.id);
                            setActiveCite(index);
                            document.getElementById(`source-${index}`)?.scrollIntoView({
                              block: "nearest",
                            });
                          }}
                        />
                      )}
                      {message.pending && message.text !== "" ? (
                        <span className="caret" aria-hidden="true" />
                      ) : null}
                    </article>
                  ),
                )}
              </div>
            )}
          </div>
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(draft);
            }}
          >
            <label className="sr" htmlFor="question">
              Question
            </label>
            <textarea
              id="question"
              rows={2}
              value={draft}
              placeholder="Ask about a fee, a lock period, a penalty…"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void ask(draft);
                }
              }}
            />
            <div className="composer-actions">
              {messages.length > 0 ? (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setMessages([]);
                    setFocusedId(null);
                    setActiveCite(null);
                  }}
                >
                  Clear
                </button>
              ) : null}
              <button
                type="submit"
                className="ask"
                disabled={pending || draft.trim().length === 0}
              >
                {pending ? "Reading" : "Ask"}
              </button>
            </div>
          </form>
        </main>

        <aside className="sources">
          <p className="eyebrow">Margin</p>
          <h2>Cited passages</h2>
          {!focused || focused.sources.length === 0 ? (
            <p className="muted">
              {focused?.refused
                ? "Nothing was cited. The refusal stands on its own."
                : "Citations for the latest answer land here, next to the clause they came from."}
            </p>
          ) : (
            <div className="cards">
              {focused.sources.map((source) => (
                <article
                  key={source.id}
                  id={`source-${source.index}`}
                  className={activeCite === source.index ? "card on" : "card"}
                >
                  <header>
                    <span>[{source.index}]</span>
                    <span>{source.score.toFixed(2)} cosine</span>
                  </header>
                  <h3>{source.title}</h3>
                  <p>
                    {source.section}
                    {source.page ? ` · p. ${source.page}` : ""} · {source.source}
                  </p>
                  <blockquote>{source.excerpt}</blockquote>
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function AnswerText({
  text,
  active,
  onCite,
}: {
  text: string;
  active: number | null;
  onCite: (index: number) => void;
}) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, index) => {
        const match = /^\[(\d+)\]$/.exec(part);
        if (!match) return <span key={`${part}-${index}`}>{part}</span>;
        const cite = Number(match[1]);
        return (
          <button
            key={`${part}-${index}`}
            type="button"
            className="cite"
            aria-pressed={active === cite}
            onClick={() => onCite(cite)}
          >
            {cite}
          </button>
        );
      })}
    </>
  );
}

function reduceEvent(message: ChatMessage, event: ChatEvent): ChatMessage {
  if (event.type === "sources") return { ...message, sources: event.sources };
  if (event.type === "token")
    return { ...message, text: message.text + event.text, refused: false };
  if (event.type === "refusal") return { ...message, text: event.text, refused: true };
  if (event.type === "error")
    return { ...message, text: event.message, error: true, pending: false };
  if (event.type === "done") return { ...message, pending: false, refused: event.refused };
  return message;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
