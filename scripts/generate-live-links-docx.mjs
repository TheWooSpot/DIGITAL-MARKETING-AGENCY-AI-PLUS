/**
 * Builds docs/socialutely-live-door-links.docx (same content as docs/notion-live-door-links.md)
 * Run: node scripts/generate-live-links-docx.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ExternalHyperlink,
  HeadingLevel,
  WidthType,
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs", "socialutely-live-door-links.docx");

const ORIGIN = "https://socialutely-any-door-engine.vercel.app";

function p(text, { italics = false } = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, italics })],
  });
}

function heading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true })],
  });
}

function linkOnly(url) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new ExternalHyperlink({
        children: [
          new TextRun({
            text: url,
            style: "Hyperlink",
          }),
        ],
        link: url,
      }),
    ],
  });
}

/**
 * @param {string[]} headers
 * @param {string[][]} rows
 * @param {number} urlColumnIndex - 0-based column index where URL hyperlinks are rendered
 */
function makeTable(headers, rows, urlColumnIndex) {
  const n = headers.length;
  const pct = 100 / n;
  const headerRow = new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          width: { size: pct, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
        }),
    ),
  });
  const dataRows = rows.map((cells) => {
    return new TableRow({
      children: cells.map((cell, i) => {
        const isUrlCol = i === urlColumnIndex && typeof cell === "string" && cell.startsWith("http");
        return new TableCell({
          width: { size: pct, type: WidthType.PERCENTAGE },
          children: isUrlCol
            ? [
                new Paragraph({
                  children: [
                    new ExternalHyperlink({
                      children: [
                        new TextRun({
                          text: cell,
                          style: "Hyperlink",
                        }),
                      ],
                      link: cell,
                    }),
                  ],
                }),
              ]
            : [new Paragraph({ children: [new TextRun(cell)] })],
        });
      }),
    });
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

async function main() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
            children: [new TextRun({ text: "Socialutely — Production door & route URLs", bold: true })],
          }),
          p(`Site origin: ${ORIGIN}`),
          p("(Swap for your custom domain if you use one in Vercel.)", { italics: true }),
          heading("Doors marked LIVE (Supabase anydoor_doors, experience layer)"),
          makeTable(
            ["Door", "Name", "Public URL"],
            [["D-2", "The Mirror", `${ORIGIN}/diagnostic`]],
            2,
          ),
          p("Same screen (alias):"),
          linkOnly(`${ORIGIN}/doors/url-diagnostic`),
          heading("Other deployed routes (building / planned in CMS — URLs still work)"),
          makeTable(
            ["Path", "Full URL"],
            [
              ["/ai-iq", `${ORIGIN}/ai-iq`],
              ["/ai-iq/report", `${ORIGIN}/ai-iq/report`],
              ["/calculator", `${ORIGIN}/calculator`],
              ["/self-discovery", `${ORIGIN}/self-discovery`],
              ["/dream", `${ORIGIN}/dream`],
              ["/quote", `${ORIGIN}/quote`],
              ["/diagnostic/results", `${ORIGIN}/diagnostic/results`],
              ["/diagnostic/unlock", `${ORIGIN}/diagnostic/unlock`],
              ["/report/{token}", `${ORIGIN}/report/{token}`],
              ["/your-package", `${ORIGIN}/your-package`],
              ["/team/tiers", `${ORIGIN}/team/tiers`],
              ["/ai-readiness/rung-2", `${ORIGIN}/ai-readiness/rung-2`],
              ["/ai-readiness/rung-3", `${ORIGIN}/ai-readiness/rung-3`],
              ["/contact", `${ORIGIN}/contact`],
              ["/privacy", `${ORIGIN}/privacy`],
              ["Home — doors section", `${ORIGIN}/#doors`],
            ],
            1,
          ),
          p("Generated for Word / Notion. CMS “live” badge may differ from deployable routes.", {
            italics: true,
          }),
        ],
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, buf);
  console.log("Wrote", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
