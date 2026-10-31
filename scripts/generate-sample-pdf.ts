import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const lines = [
  "FICTIONAL SAMPLE. Northline Bank is not a real institution.",
  "Overdraft Coverage Disclosure",
  "Coverage for everyday debit card and ATM transactions is offered only if you opt in.",
  "Northline charges $35 per overdraft item and no more than 3 overdraft fees per business day.",
  "Northline will not charge an overdraft fee if an account is overdrawn by $50 or less.",
  "The balance that decides the fee is measured at the end of the business day.",
  "Overdraft coverage is not a line of credit and may be suspended at any time.",
];

const document = await PDFDocument.create();
document.setTitle("Overdraft Coverage Disclosure");
document.setAuthor("Northline Bank (fictional)");
document.setSubject("Synthetic sample for the Fathom RAG demo. Not a real bank policy.");
const page = document.addPage([612, 792]);
const font = await document.embedFont(StandardFonts.Helvetica);
const bold = await document.embedFont(StandardFonts.HelveticaBold);
let y = 740;
lines.forEach((line, index) => {
  const size = index === 1 ? 16 : 11;
  page.drawText(line, {
    x: 54,
    y,
    size,
    font: index === 1 ? bold : font,
    color: rgb(0.1, 0.1, 0.08),
    maxWidth: 504,
  });
  y -= index === 1 ? 36 : 28;
});

const bytes = await document.save();
const target = resolve(process.cwd(), "corpus/overdraft-policy.pdf");
await writeFile(target, bytes);
console.log(`Wrote ${target}`);
