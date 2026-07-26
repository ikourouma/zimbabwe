/**
 * Display-layer cleanup for the free-text `province` field (see BACKLOG.md "Full province data
 * migration" — the ~30 seed projects' province strings are genuinely messy, e.g. multi-province
 * spans ("Harare / National") and one project whose deck-validation note ended up baked into the
 * field itself). This never touches the underlying DB value — only how it's summarized for
 * executive-report charts/tables.
 */

/** Strips any parenthetical aside (source-deck/validation notes, etc.) from a province string for
 *  display purposes — e.g. "Matabeleland North / Hwange area (source deck lists Mashonaland
 *  Central on title slide; requires validation)" -> "Matabeleland North / Hwange area". */
export function cleanProvinceLabel(raw: string): string {
  return raw.replace(/\s*\([^)]*\)/g, "").trim();
}

/** Groups a cleaned province label into its report bucket: any label spanning multiple
 *  provinces/regions (still containing "/") is aggregated into one "Multi-Province / National"
 *  bucket rather than rendering as its own illegible bar per unique combination. */
export function bucketProvinceLabel(raw: string): string {
  const cleaned = cleanProvinceLabel(raw);
  if (!cleaned) return "Unspecified";
  return cleaned.includes("/") ? "Multi-Province / National" : cleaned;
}
