/**
 * Uploads placeholder PDFs for seeded project_documents rows whose storage_key starts with
 * pending-r2/. Safe to re-run — skips keys that already exist in R2.
 *
 * Run: npx tsx --env-file=.env.local scripts/backfill-pending-documents.ts
 */
import { eq, like } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { projectDocuments, projects } from "@/lib/db/schema";
import { isR2Configured, objectExists, putObject } from "@/lib/storage/r2";

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPlaceholderPdf(lines: string[]): Buffer {
  const fontSize = 12;
  const lineHeight = 16;
  let y = 750;
  const commands = lines
    .map((line) => {
      const cmd = `BT /F1 ${fontSize} Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
      y -= lineHeight;
      return cmd;
    })
    .join("\n");

  const stream = commands;
  const streamBytes = Buffer.byteLength(stream, "utf8");

  const parts = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const part of parts) {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += part;
  }

  const xrefOffset = Buffer.byteLength(body, "utf8");
  body += `xref\n0 ${parts.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let i = 1; i <= parts.length; i++) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${parts.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(body, "utf8");
}

async function main() {
  if (!isR2Configured()) {
    console.error("R2 is not configured — set R2_* env vars in .env.local");
    process.exit(1);
  }

  const rows = await db
    .select({
      id: projectDocuments.id,
      title: projectDocuments.title,
      storageKey: projectDocuments.storageKey,
      projectTitle: projects.title,
    })
    .from(projectDocuments)
    .innerJoin(projects, eq(projectDocuments.projectId, projects.id))
    .where(like(projectDocuments.storageKey, "pending-r2/%"));

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      if (await objectExists(row.storageKey)) {
        skipped++;
        continue;
      }

      const pdf = buildPlaceholderPdf([
        row.title,
        `Project: ${row.projectTitle}`,
        "",
        "Illustrative pilot content pending official validation.",
        "This placeholder was generated for demo and UAT purposes.",
      ]);

      await putObject(row.storageKey, pdf, "application/pdf");
      uploaded++;
    } catch (error) {
      failed++;
      console.error(`Failed ${row.storageKey}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(
    JSON.stringify(
      {
        totalPendingRows: rows.length,
        uploaded,
        skipped,
        failed,
      },
      null,
      2
    )
  );

  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
