export interface TextSection {
  section: string;
  text: string;
  page: number | null;
}

export interface ChunkSource {
  documentId: string;
  title: string;
  product: string;
  source: string;
}

export interface ChunkDraft extends ChunkSource {
  section: string;
  text: string;
  page: number | null;
}

export interface ChunkOptions {
  maxChars?: number;
  overlapChars?: number;
}

export const DEFAULT_CHUNK_CHARS = 900;
export const DEFAULT_CHUNK_OVERLAP = 120;

interface Heading {
  level: number;
  text: string;
}

interface OpenSection {
  section: string;
  lines: string[];
}

export function markdownToSections(markdown: string): TextSection[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections: TextSection[] = [];
  const stack: Heading[] = [];
  let current: OpenSection | null = null;

  const flush = () => {
    if (!current) return;
    const text = current.lines.join("\n").trim();
    if (text) sections.push({ section: current.section, text, page: null });
    current = null;
  };

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!heading) {
      if (!current) current = { section: "Overview", lines: [] };
      current.lines.push(line);
      continue;
    }
    flush();
    const marks = heading[1] ?? "#";
    const title = (heading[2] ?? "").trim();
    const level = marks.length;
    while (stack.length > 0 && (stack[stack.length - 1]?.level ?? 0) >= level) stack.pop();
    stack.push({ level, text: title });
    current = { section: stack.map((item) => item.text).join(" / "), lines: [] };
  }
  flush();
  return sections;
}

export function splitSectionBody(
  text: string,
  maxChars = DEFAULT_CHUNK_CHARS,
  overlapChars = DEFAULT_CHUNK_OVERLAP,
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];
  return packUnits(unitsFor(normalized, maxChars), maxChars, overlapChars);
}

export function chunkSections(
  source: ChunkSource,
  sections: TextSection[],
  options: ChunkOptions = {},
): ChunkDraft[] {
  const maxChars = options.maxChars ?? DEFAULT_CHUNK_CHARS;
  const overlapChars = options.overlapChars ?? DEFAULT_CHUNK_OVERLAP;
  const drafts: ChunkDraft[] = [];
  for (const section of sections) {
    const parts = splitSectionBody(section.text, maxChars, overlapChars);
    for (const part of parts) {
      const prefix = section.section ? `${section.section}\n\n` : "";
      const text = `${prefix}${part}`.trim();
      if (!text) continue;
      drafts.push({ ...source, section: section.section, text, page: section.page });
    }
  }
  return drafts;
}

function unitsFor(text: string, maxChars: number): string[] {
  const paragraphs = text
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const units: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      units.push(paragraph);
      continue;
    }
    const sentences = paragraph
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    for (const sentence of sentences) {
      if (sentence.length <= maxChars) units.push(sentence);
      else units.push(...hardWrap(sentence, maxChars));
    }
  }
  return units;
}

function hardWrap(text: string, maxChars: number): string[] {
  const parts: string[] = [];
  let rest = text.trim();
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf(" ", maxChars);
    if (cut < Math.floor(maxChars / 2)) cut = maxChars;
    const next = rest.slice(0, cut).trim();
    if (next) parts.push(next);
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

function packUnits(units: string[], maxChars: number, overlapChars: number): string[] {
  const chunks: string[] = [];
  let current = "";
  const commit = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
  };
  for (const unit of units) {
    if (!current) {
      current = unit;
      continue;
    }
    const combined = `${current}\n\n${unit}`;
    if (combined.length <= maxChars) {
      current = combined;
      continue;
    }
    commit();
    const tail = overlapTail(current, overlapChars);
    const withTail = tail ? `${tail}\n\n${unit}` : unit;
    current = withTail.length <= maxChars ? withTail : unit;
  }
  commit();
  return chunks;
}

function overlapTail(text: string, overlapChars: number): string {
  if (overlapChars <= 0 || text.length <= overlapChars) return "";
  const slice = text.slice(text.length - overlapChars);
  const space = slice.indexOf(" ");
  return (space === -1 ? slice : slice.slice(space + 1)).trim();
}
