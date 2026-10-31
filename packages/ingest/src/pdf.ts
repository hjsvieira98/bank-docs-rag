import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { extractText, getDocumentProxy } from "unpdf";
import type { LoadedDocument } from "./markdown";

interface PdfMeta {
  id: string;
  title: string;
  product: string;
}

export async function loadPdf(
  filePath: string,
  corpusDir: string,
): Promise<LoadedDocument> {
  const source = basename(filePath);
  const metaPath = join(corpusDir, source.replace(/\.pdf$/i, ".json"));
  const meta = JSON.parse(await readFile(metaPath, "utf8")) as Partial<PdfMeta>;
  if (!meta.id || !meta.title || !meta.product) {
    throw new Error(`${source} needs a sidecar JSON file with id, title, and product.`);
  }
  const bytes = new Uint8Array(await readFile(filePath));
  const document = await getDocumentProxy(bytes);
  const extracted = await extractText(document, { mergePages: false });
  const pages = Array.isArray(extracted.text) ? extracted.text : [extracted.text];
  const sections = pages
    .map((page, index) => ({
      section: `Page ${index + 1}`,
      text: page.replace(/\s+/g, " ").trim(),
      page: index + 1,
    }))
    .filter((section) => section.text.length > 0);
  const closable = document as { destroy?: () => Promise<void> | void };
  await closable.destroy?.();
  return {
    documentId: meta.id,
    title: meta.title,
    product: meta.product,
    source,
    sections,
  };
}
