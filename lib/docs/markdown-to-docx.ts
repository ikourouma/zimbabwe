import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
} from "docx";

/**
 * Renders the constrained Markdown subset used by the stakeholder documents into Word.
 *
 * Markdown stays the source of truth — version-controlled, diffable, reviewable in a pull request —
 * and Word is a build artifact. That split is what lets screenshots stay current: when the interface
 * changes, the capture pass re-runs and every image in every document updates from one command,
 * instead of somebody reopening seven Word files to re-paste them by hand.
 *
 * Deliberately not a general Markdown implementation. It handles exactly what the documents use, and
 * anything else falls through as plain text rather than failing, because a silent formatting glitch
 * in a stakeholder document is better than a build that stops halfway through a deliverable.
 *
 * Supported: ATX headings, paragraphs, bullet and numbered lists, pipe tables, blockquote callouts,
 * standalone images with captions, horizontal rules, and inline bold/italic/code.
 */

const ACCENT = "0B3D0B"; // the platform's sovereign dark green, matching lib/mou/docx-export.ts
const MUTED = "555555";
const CALLOUT_FILL = "F2F5F2";
const TABLE_HEADER_FILL = "EDEFED";
const RULE_COLOR = "D6D9D6";

/** Letter page minus one-inch margins, in pixels at the 96 DPI docx assumes. */
const CONTENT_WIDTH_PX = 624;

export interface DocumentMeta {
  /** Document title, taken from the single H1. */
  title: string;
  /** Running header line, taken from the first italic line beneath the title. */
  header: string;
  /** Running footer line, taken from the second italic line beneath the title. */
  footer: string;
}

export interface RenderOptions {
  /** Resolves an image path from the Markdown source to raw bytes, or null to skip it. */
  resolveImage: (src: string) => Buffer | null;
}

// --- inline formatting -------------------------------------------------------

const INLINE_TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

/** Splits a line into runs, honouring bold, italic and inline code. */
function inlineRuns(text: string, base: { size?: number; color?: string; italics?: boolean } = {}): TextRun[] {
  const parts = text.split(INLINE_TOKEN).filter((p) => p !== "");

  return parts.map((part) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return new TextRun({ ...base, text: part.slice(2, -2), bold: true });
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return new TextRun({ ...base, text: part.slice(1, -1), italics: true });
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      // Courier rather than a shaded run: inline code here is route paths and role names, which read
      // better as plain monospace than as highlighted code in a document read by non-engineers.
      return new TextRun({ ...base, text: part.slice(1, -1), font: "Consolas", size: base.size ?? 19 });
    }
    return new TextRun({ ...base, text: part });
  });
}

/** Strips inline markers for contexts that cannot carry runs, such as image captions. */
function stripInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1");
}

// --- block builders ----------------------------------------------------------

function heading(text: string, level: 1 | 2 | 3): Paragraph {
  const spec = {
    1: { heading: HeadingLevel.HEADING_1, size: 32, before: 0, after: 160 },
    2: { heading: HeadingLevel.HEADING_2, size: 26, before: 360, after: 140 },
    3: { heading: HeadingLevel.HEADING_3, size: 22, before: 260, after: 100 },
  }[level];

  // Headings carry no inline markup, so the markers are stripped rather than parsed into runs: a
  // heading is one styled run, and re-applying bold/colour per run would fight the style anyway.
  return new Paragraph({
    heading: spec.heading,
    spacing: { before: spec.before, after: spec.after },
    children: [new TextRun({ text: stripInline(text), bold: true, color: ACCENT, size: spec.size })],
  });
}

function paragraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 280 },
    children: inlineRuns(text),
  });
}

function listItem(text: string, ordered: boolean, index: number): Paragraph {
  return new Paragraph({
    spacing: { after: 60, line: 280 },
    indent: { left: convertInchesToTwip(0.3) },
    children: ordered
      ? [new TextRun({ text: `${index}.  `, bold: true }), ...inlineRuns(text)]
      : inlineRuns(text),
    bullet: ordered ? undefined : { level: 0 },
  });
}

function horizontalRule(): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE_COLOR, space: 1 } },
    children: [],
  });
}

/**
 * Blockquote callout, rendered as the concept note's shaded box: a single-cell borderless table.
 * A first line that is entirely bold becomes the box title.
 */
function callout(lines: string[]): Table {
  const [first, ...rest] = lines;
  const titled = /^\*\*.+\*\*$/.test(first.trim());
  const title = titled ? first.trim().slice(2, -2) : null;
  const body = titled ? rest : lines;

  const children: Paragraph[] = [];
  if (title) {
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: title, bold: true, color: ACCENT })],
      })
    );
  }
  for (const line of body) {
    if (!line.trim()) continue;
    children.push(new Paragraph({ spacing: { after: 60, line: 280 }, children: inlineRuns(line) }));
  }
  if (children.length === 0) children.push(new Paragraph({ children: [] }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "auto" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
      left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT },
      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: CALLOUT_FILL, color: "auto" },
            margins: {
              top: convertInchesToTwip(0.12),
              bottom: convertInchesToTwip(0.12),
              left: convertInchesToTwip(0.15),
              right: convertInchesToTwip(0.15),
            },
            children,
          }),
        ],
      }),
    ],
  });
}

function dataTable(rows: string[][]): Table {
  const [header, ...body] = rows;

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: RULE_COLOR },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE_COLOR },
      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: RULE_COLOR },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: header.map(
          (cell) =>
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: TABLE_HEADER_FILL, color: "auto" },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: stripInline(cell), bold: true, size: 19, color: ACCENT })],
                }),
              ],
            })
        ),
      }),
      ...body.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  margins: { top: 80, bottom: 80, left: 100, right: 100 },
                  children: [
                    new Paragraph({ spacing: { line: 260 }, children: inlineRuns(cell, { size: 19 }) }),
                  ],
                })
            ),
          })
      ),
    ],
  });
}

/**
 * Reads intrinsic dimensions straight from the PNG header rather than pulling in an image library:
 * the IHDR chunk always starts at byte 16 with big-endian width then height.
 */
function pngSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24 || buffer.readUInt32BE(12) !== 0x49484452) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function image(alt: string, src: string, resolve: RenderOptions["resolveImage"]): Paragraph[] {
  const data = resolve(src);
  if (!data) {
    return [
      new Paragraph({
        spacing: { before: 120, after: 160 },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `[missing screenshot: ${src}]`, italics: true, color: MUTED, size: 18 }),
        ],
      }),
    ];
  }

  const size = pngSize(data);
  const width = CONTENT_WIDTH_PX;
  const height = size ? Math.round((size.height / size.width) * width) : Math.round(width * 0.625);

  return [
    new Paragraph({
      spacing: { before: 160, after: 60 },
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({ type: "png", data, transformation: { width, height } }),
      ],
    }),
    ...(alt
      ? [
          new Paragraph({
            spacing: { after: 200 },
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: stripInline(alt), italics: true, color: MUTED, size: 18 })],
          }),
        ]
      : []),
  ];
}

// --- parser ------------------------------------------------------------------

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
const isTableDivider = (line: string) => /^\s*\|[\s:|-]+\|\s*$/.test(line);

/** Extracts the title and the two running lines, and returns the body that follows them. */
function extractMeta(lines: string[]): { meta: DocumentMeta; bodyStart: number } {
  let title = "";
  const italics: string[] = [];
  let i = 0;

  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (!title && line.startsWith("# ")) {
      title = line.slice(2).trim();
      continue;
    }
    if (title && /^\*.+\*$/.test(line) && italics.length < 2) {
      italics.push(line.slice(1, -1).trim());
      continue;
    }
    break;
  }

  return {
    meta: { title, header: italics[0] ?? "", footer: italics[1] ?? "" },
    bodyStart: i,
  };
}

export async function markdownToDocx(markdown: string, options: RenderOptions): Promise<Buffer> {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const { meta, bodyStart } = extractMeta(lines);

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: meta.title, bold: true, size: 40, color: ACCENT })],
    }),
    ...(meta.header
      ? [
          new Paragraph({
            spacing: { after: 20 },
            children: [new TextRun({ text: meta.header, italics: true, color: MUTED, size: 18 })],
          }),
        ]
      : []),
    ...(meta.footer
      ? [
          new Paragraph({
            spacing: { after: 280 },
            children: [new TextRun({ text: meta.footer, italics: true, color: MUTED, size: 18 })],
          }),
        ]
      : []),
  ];

  let i = bodyStart;
  let orderedIndex = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      orderedIndex = 0;
      i++;
      continue;
    }

    if (/^---+$/.test(line)) {
      children.push(horizontalRule());
      i++;
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      children.push(heading(headingMatch[2].trim(), headingMatch[1].length as 1 | 2 | 3));
      i++;
      continue;
    }

    const imageMatch = /^!\[(.*?)\]\((.+?)\)$/.exec(line);
    if (imageMatch) {
      children.push(...image(imageMatch[1], imageMatch[2], options.resolveImage));
      i++;
      continue;
    }

    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      children.push(callout(quote));
      continue;
    }

    if (isTableRow(line)) {
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i].trim())) {
        if (!isTableDivider(lines[i])) rows.push(parseTableRow(lines[i]));
        i++;
      }
      if (rows.length) children.push(dataTable(rows));
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      children.push(listItem(bullet[1], false, 0));
      i++;
      continue;
    }

    const ordered = /^(\d+)\.\s+(.*)$/.exec(line);
    if (ordered) {
      orderedIndex += 1;
      children.push(listItem(ordered[2], true, orderedIndex));
      i++;
      continue;
    }

    children.push(paragraph(line));
    i++;
  }

  const runningHeader = new Header({
    children: [
      new Paragraph({
        spacing: { after: 60 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE_COLOR, space: 4 } },
        children: [new TextRun({ text: meta.header, size: 16, color: MUTED })],
      }),
    ],
  });

  const runningFooter = new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: `${meta.footer}${meta.footer ? " | " : ""}Page `, size: 16, color: MUTED }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUTED }),
        ],
      }),
    ],
  });

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 21 } },
      },
    },
    sections: [
      {
        properties: {
          // Title page suppresses the running header on page one, matching the concept note, where
          // the header first appears on page two.
          titlePage: true,
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        headers: { default: runningHeader, first: new Header({ children: [] }) },
        footers: { default: runningFooter, first: runningFooter },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
