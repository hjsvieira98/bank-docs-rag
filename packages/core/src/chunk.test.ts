import { describe, expect, it } from "vitest";
import { chunkSections, markdownToSections, splitSectionBody } from "./chunk";

describe("markdownToSections", () => {
  it("keeps a heading path", () => {
    const sections = markdownToSections(
      "# Home\n\nIntro line about the loan.\n\n## Rate lock\n\nForty-five days.\n\n### Extension\n\nIt costs extra.\n",
    );
    expect(sections.map((section) => section.section)).toEqual([
      "Home",
      "Home / Rate lock",
      "Home / Rate lock / Extension",
    ]);
    expect(sections[1]?.text).toBe("Forty-five days.");
  });
});

describe("splitSectionBody", () => {
  it("returns a short section unchanged", () => {
    expect(splitSectionBody("A short clause.", 80, 10)).toEqual(["A short clause."]);
  });

  it("windows a long section, preserves every word, and overlaps when it fits", () => {
    const text = "alpha bravo charlie delta echo.\n\nfoxtrot";
    const parts = splitSectionBody(text, 36, 12);
    expect(parts.length).toBe(2);
    expect(parts[0]?.length).toBeLessThanOrEqual(36);
    expect(parts[1]?.startsWith("delta echo")).toBe(true);
    expect(parts[1]).toContain("foxtrot");
    for (const word of ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"]) {
      expect(parts.some((part) => part.includes(word))).toBe(true);
    }
  });
});

describe("chunkSections", () => {
  it("prefixes each chunk with its section label", () => {
    const chunks = chunkSections(
      {
        documentId: "mortgage-terms",
        title: "Home loan",
        product: "Home loans",
        source: "mortgage-terms.md",
      },
      [
        {
          section: "Rate lock",
          text: "A mortgage rate lock lasts 45 calendar days.",
          page: null,
        },
      ],
    );
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text.startsWith("Rate lock\n\n")).toBe(true);
    expect(chunks[0]?.documentId).toBe("mortgage-terms");
  });
});
