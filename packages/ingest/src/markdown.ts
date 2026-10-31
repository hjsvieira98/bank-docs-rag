import { readFile } from "node:fs/promises";
import { markdownToSections, type TextSection } from "@fathom/core";

export interface LoadedDocument {
  documentId: string;
  title: string;
  product: string;
  source: string;
  sections: TextSection[];
}

export async function loadMarkdown(
  filePath: string,
  source: string,
): Promise<LoadedDocument> {
  const raw = await readFile(filePath, "utf8");
  const { data, body } = splitFrontmatter(raw);
  const documentId = required(data, "id", source);
  if (!/^[a-z0-9-]+$/.test(documentId)) {
    throw new Error(
      `${source} has an invalid id "${documentId}". Use lowercase letters, numbers, and hyphens.`,
    );
  }
  const withoutQuotes = body
    .split("\n")
    .filter((line) => !line.trimStart().startsWith(">"))
    .join("\n");
  return {
    documentId,
    title: required(data, "title", source),
    product: required(data, "product", source),
    source,
    sections: markdownToSections(withoutQuotes),
  };
}

export function splitFrontmatter(source: string): {
  data: Record<string, string>;
  body: string;
} {
  const normalized = source.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return { data: {}, body: normalized };
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) return { data: {}, body: normalized };
  const raw = normalized.slice(4, end);
  const body = normalized.slice(end + "\n---\n".length);
  const data: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    const key = match?.[1];
    const value = match?.[2];
    if (!key || value === undefined) continue;
    data[key] = value.trim().replace(/^["']|["']$/g, "");
  }
  return { data, body };
}

function required(data: Record<string, string>, key: string, file: string): string {
  const value = data[key];
  if (!value) throw new Error(`${file} is missing frontmatter field "${key}".`);
  return value;
}
