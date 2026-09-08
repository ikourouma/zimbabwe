/**
 * Repairs source files whose non-ASCII characters were double-encoded, and strips the byte-order
 * mark that came with them.
 *
 * Windows PowerShell's `Get-Content` decodes a file using the system ANSI code page when it finds
 * no BOM, and `Set-Content -Encoding UTF8` writes UTF-8 with one. Round-tripping a UTF-8 source
 * file through that pair therefore reads every multi-byte character as a run of Windows-1252
 * characters and then re-encodes each of those as UTF-8: an em dash becomes "â€”", a middot "Â·",
 * an ellipsis "â€¦". The result is still valid UTF-8, so nothing complains — it simply renders as
 * mojibake, including inside user-facing strings such as the investor dashboard's own subtitle.
 *
 * The reverse is exact, because the corruption is: utf8_encode(cp1252_decode(utf8_bytes)). Encoding
 * the mojibake back to Windows-1252 recovers the original bytes, and decoding those as UTF-8
 * recovers the text. Anything that fails to round-trip is left untouched and reported, so a file
 * containing a genuine "Â·" is never silently rewritten.
 *
 *   npx tsx scripts/repair-mojibake.ts            # report only
 *   npx tsx scripts/repair-mojibake.ts --commit   # apply
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const COMMIT = process.argv.includes("--commit");

/** Windows-1252's 0x80–0x9F block, which is where it differs from Latin-1 — and where most of the
 *  mojibake lands, since UTF-8 continuation bytes fall in that range. */
const CP1252_HIGH: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

/** Encodes to Windows-1252, or returns null if any character has no representation there — which
 *  means the text was not produced by the corruption this script reverses. */
function toCp1252(text: string): Buffer | null {
  const out = Buffer.alloc(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i)!;
    if (code > 0xffff) return null;
    // 0x80–0x9F included: five slots in that range are undefined in Windows-1252, and a decoder
    // that meets one passes the byte through as the matching C1 control character. A closing
    // curly quote, whose third UTF-8 byte is 0x9D, corrupts to exactly that. Those control
    // characters have no legitimate place in source text, so mapping them back is unambiguous.
    if (code <= 0xff) {
      out[i] = code;
      continue;
    }
    const mapped = CP1252_HIGH[code];
    if (mapped === undefined) return null;
    out[i] = mapped;
  }
  return out;
}

/**
 * Characters that a UTF-8 byte can appear as once it has been read through Windows-1252. Every
 * mojibake run is made entirely of these, because every byte of a multi-byte UTF-8 sequence is
 * ≥ 0x80 and each maps to exactly one of them.
 */
const MOJIBAKE_ALPHABET =
  /[\u0080-\u00FF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]+/g;

/**
 * Repairs run by run rather than whole-file.
 *
 * Several of these files hold correct text alongside corrupted text, because they were edited both
 * through PowerShell and directly. Round-tripping the whole file therefore fails on the correct
 * characters and rescues nothing. A maximal run of the mojibake alphabet, on the other hand, is
 * either the corrupted image of some UTF-8 bytes — in which case those bytes decode cleanly and the
 * run is replaced — or it is genuine text, in which case the bytes are not valid UTF-8 and it is
 * left exactly as it stands. A lone correct em dash encodes to the single byte 0x97, which is not a
 * valid UTF-8 sequence, so it survives untouched.
 */
function repair(text: string): { fixed: string; runs: number } {
  let runs = 0;
  const fixed = text.replace(MOJIBAKE_ALPHABET, (run) => {
    const bytes = toCp1252(run);
    if (!bytes) return run;
    const decoded = bytes.toString("utf8");
    if (decoded.includes("\uFFFD") || decoded === run) return run;
    runs += 1;
    return decoded;
  });
  return { fixed, runs };
}

/**
 * Files that quote the corrupted sequences on purpose, to explain them. This script's own header
 * gives "â€”" and "Â·" as worked examples, and the defect log's DEF-042 entry shows a reader what
 * was actually on screen. Repairing those would delete the evidence and the explanation, and would
 * do it silently every time the check ran.
 */
const DOCUMENTS_THE_CORRUPTION = new Set(["scripts/repair-mojibake.ts", "docs/UAT-Defect-Log.md"]);

// Only files git already tracks, so an untracked scratch file can never be rewritten by accident.
const tracked = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .map((f) => f.trim())
  .filter((f) => /\.(ts|tsx|js|jsx|md|json|css)$/.test(f))
  .filter((f) => !DOCUMENTS_THE_CORRUPTION.has(f));

let changed = 0;
let skipped = 0;

for (const file of tracked) {
  const raw = readFileSync(file);
  const hadBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  const text = raw.toString("utf8").replace(/^\uFEFF/, "");

  // The three sequences that account for the corruption in this repository. Checking for them
  // first keeps the round-trip off the thousands of files that are simply fine.
  if (!/[Ââ]€|Â[·»«]|Ã[©¨¡]|â†/.test(text)) {
    if (hadBom && COMMIT) {
      writeFileSync(file, Buffer.from(text, "utf8"));
      console.log(`  + ${file} (BOM removed)`);
      changed += 1;
    }
    continue;
  }

  const { fixed, runs } = repair(text);
  if (runs === 0 && !hadBom) {
    console.log(`  · ${file} — high characters present but none round-trip; left alone`);
    skipped += 1;
    continue;
  }

  const sample = fixed.split("\n").find((l) => /—|·|…|→/.test(l))?.trim().slice(0, 90) ?? "";
  console.log(
    `  ${COMMIT ? "+" : "~"} ${file} — ${runs} run(s)${hadBom ? ", BOM removed" : ""}\n      ${sample}`
  );
  changed += 1;

  if (COMMIT) writeFileSync(file, Buffer.from(fixed, "utf8"));
}

console.log(
  `\n${COMMIT ? "Repaired" : "Would repair"} ${changed} file(s)${skipped ? `; left ${skipped} alone` : ""}.`
);
if (!COMMIT) console.log("Nothing was written. Re-run with --commit to apply.");
