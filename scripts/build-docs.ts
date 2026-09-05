import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { markdownToDocx } from "../lib/docs/markdown-to-docx";

/**
 * Builds Word versions of every stakeholder document. Run with `npm run docs:build`.
 *
 * Discovery is by format signature rather than a hard-coded list: a document opts in by carrying the
 * standard running-header line beneath its title. That way adding a persona guide needs no change
 * here, and README-style files in docs/ are left alone.
 *
 * Output goes to docs/build/, which is git-ignored — the Markdown is the artifact under review, and
 * the Word files are regenerated whenever screenshots or wording change.
 */

const REPO_ROOT = resolve(__dirname, "..");
const DOCS_DIR = join(REPO_ROOT, "docs");
const OUTPUT_DIR = join(DOCS_DIR, "build");

/** The running-header line every document in this format carries. */
const FORMAT_SIGNATURE = /^\*Afronovation \|/m;

function findDocuments(dir: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    // Never descend into the output directory or the screenshot corpus.
    if (full === OUTPUT_DIR || entry === "screenshots") continue;

    if (statSync(full).isDirectory()) {
      found.push(...findDocuments(full));
      continue;
    }

    if (!entry.endsWith(".md")) continue;
    if (FORMAT_SIGNATURE.test(readFileSync(full, "utf8"))) found.push(full);
  }

  return found;
}

/**
 * Images are written as repo-relative paths so the Markdown renders correctly on GitHub and in the
 * editor preview; here they resolve against the repo root. A missing image is reported but does not
 * stop the build — a document with one gap is more useful than no document.
 */
function makeImageResolver(missing: string[]) {
  return (src: string): Buffer | null => {
    const candidates = [join(REPO_ROOT, src), join(DOCS_DIR, src)];
    for (const candidate of candidates) {
      if (existsSync(candidate)) return readFileSync(candidate);
    }
    missing.push(src);
    return null;
  };
}

async function main() {
  const documents = findDocuments(DOCS_DIR);

  if (documents.length === 0) {
    console.error("No documents found. Expected at least one .md in docs/ with the standard header line.");
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Building ${documents.length} document${documents.length === 1 ? "" : "s"} into docs/build/\n`);

  let totalMissing = 0;

  for (const source of documents) {
    const missing: string[] = [];
    const markdown = readFileSync(source, "utf8");
    const buffer = await markdownToDocx(markdown, { resolveImage: makeImageResolver(missing) });

    const name = basename(source, ".md");
    writeFileSync(join(OUTPUT_DIR, `${name}.docx`), buffer);

    const relative = source.slice(REPO_ROOT.length + 1).replace(/\\/g, "/");
    const images = markdown.match(/^!\[.*?\]\(.+?\)$/gm)?.length ?? 0;
    const embedded = images - missing.length;

    console.log(`  ${name}.docx`);
    console.log(`    from ${relative}${images ? ` — ${embedded}/${images} screenshots embedded` : ""}`);

    for (const src of missing) {
      console.log(`    missing: ${src}`);
    }
    totalMissing += missing.length;
  }

  console.log(`\nDone. Word files are in docs/build/ and are not committed.`);

  if (totalMissing > 0) {
    console.log(
      `${totalMissing} screenshot${totalMissing === 1 ? " is" : "s are"} missing — run \`npm run screenshots\` to capture them.`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
