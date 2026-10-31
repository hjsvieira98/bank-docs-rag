import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import type { SearchHit } from "./store/types";

describe("prompts", () => {
  it("requires citations and the refusal sentinel", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("NOT_IN_DOCS");
    expect(prompt).toContain("[1]");
  });

  it("numbers the supplied passages", () => {
    const source: SearchHit = {
      id: "a",
      documentId: "mortgage-terms",
      title: "Home loan",
      product: "Home loans",
      section: "Rate lock",
      text: "45 calendar days",
      source: "mortgage-terms.md",
      page: null,
      score: 1,
    };
    const prompt = buildUserPrompt("How long is the lock?", [source]);
    expect(prompt).toContain("[1] Home loan — Rate lock");
    expect(prompt).toContain("Question: How long is the lock?");
  });
});
