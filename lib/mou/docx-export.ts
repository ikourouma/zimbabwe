import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
} from "docx";
import type { EngagementMou } from "@/lib/types";
import { MOU_STATUS_LABELS } from "@/lib/governance/mou-workflow";

const HEADING_COLOR = "0B3D0B"; // matches the platform's dark-green sovereign accent
const MUTED_COLOR = "555555";

function section(title: string, body?: string | null): Paragraph[] {
  if (!body?.trim()) return [];
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 240, after: 80 },
      children: [new TextRun({ text: title, bold: true, color: HEADING_COLOR })],
    }),
    new Paragraph({ children: [new TextRun({ text: body.trim() })] }),
  ];
}

function bulletList(title: string, items?: string[]): Paragraph[] {
  if (!items?.length) return [];
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 240, after: 80 },
      children: [new TextRun({ text: title, bold: true, color: HEADING_COLOR })],
    }),
    ...items.map((item) => new Paragraph({ text: item, bullet: { level: 0 } })),
  ];
}

/**
 * Renders an EngagementMou into a downloadable .docx buffer (Phase 7 — MOU content upgrade).
 * Deliberately a one-shot render from the current `content`/`contentSnapshot`, not a live-editable
 * document — corrections still happen in-platform through the structured form + Communication Hub
 * thread (see components/deal-room/mou-panel.tsx), matching the "single source of truth" design the
 * whole MOU subsystem already follows. Uses `contentSnapshot` once one exists (finalized+), falling
 * back to the live `content` while still drafting/in review.
 */
export async function renderMouDocx(mou: EngagementMou, formattingOverrides?: { letterhead?: boolean }): Promise<Buffer> {
  const content = mou.contentSnapshot ?? mou.content;
  const showLetterhead = formattingOverrides?.letterhead ?? mou.formatting.letterhead ?? false;

  const titleBlock: Paragraph[] = [
    ...(showLetterhead
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [new TextRun({ text: "REPUBLIC OF ZIMBABWE", bold: true, size: 20, color: MUTED_COLOR })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "Zimbabwe Investment and Development Agency (ZIDA)", size: 18, color: MUTED_COLOR }),
            ],
          }),
        ]
      : []),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: "MEMORANDUM OF UNDERSTANDING", bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
      children: [
        new TextRun({
          text: `Status: ${MOU_STATUS_LABELS[mou.status]}${mou.contentSnapshot ? " (finalized content)" : ""}`,
          italics: true,
          size: 18,
          color: MUTED_COLOR,
        }),
      ],
    }),
  ];

  const body: Paragraph[] = [
    ...section("Parties", content.parties),
    ...section("Project Reference", content.projectReference),
    ...section("Purpose", content.purpose),
    ...section("Scope of Collaboration", content.scope),
    ...section("Indicative Capital", content.indicativeCapital),
    ...section("Effective Date", content.effectiveDate),
    ...bulletList("Key Terms", content.termBullets),
    ...section("Special Conditions", content.specialConditions),
    ...section("Non-Binding Clause", content.nonBindingStatement),
    ...section("Governing Law", content.governingLaw),
  ];

  const signatureBlock: Paragraph[] =
    mou.status === "executed" && mou.signatureMetadata
      ? [
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 160 },
            children: [new TextRun({ text: "Signatures", bold: true, color: HEADING_COLOR })],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "For the Investor: ", bold: true }),
              new TextRun({ text: mou.signatureMetadata.investorSignedBy ?? "" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: `${mou.signatureMetadata.investorSignedRole ?? ""} — ${mou.signatureMetadata.investorSignedDate ?? ""}`,
                color: MUTED_COLOR,
                size: 18,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "For ZIDA: ", bold: true }),
              new TextRun({ text: mou.signatureMetadata.zidaSignedBy ?? "" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: `${mou.signatureMetadata.zidaSignedRole ?? ""} — ${mou.signatureMetadata.zidaSignedDate ?? ""}`,
                color: MUTED_COLOR,
                size: 18,
              }),
            ],
          }),
          ...(mou.signatureMetadata.methodOrLocation
            ? [
                new Paragraph({
                  children: [new TextRun({ text: mou.signatureMetadata.methodOrLocation, italics: true, color: MUTED_COLOR, size: 18 })],
                }),
              ]
            : []),
        ]
      : [];

  const footerText = mou.formatting.footerText;

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [...titleBlock, ...body, ...signatureBlock],
        footers: footerText
          ? {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: footerText, size: 16, color: MUTED_COLOR })],
                  }),
                ],
              }),
            }
          : undefined,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
