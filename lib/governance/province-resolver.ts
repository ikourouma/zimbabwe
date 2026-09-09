/**
 * Project Data Standardisation, Phase 3 — the single parser that turns the free-text `province`
 * column (e.g. "Mashonaland East / Manicaland / Masvingo") into rows in the `project_provinces`
 * junction (lib/db/schema/projects.ts), against the canonical ten-province registry in
 * lib/data/taxonomies.ts. Shared by two callers so the two tiers agree on the same mapping:
 *
 * - `syncProjectRelations` (lib/db/queries/projects.ts) calls this on every create/update, so a
 *   brand-new full_template project's single-province dropdown selection (an always-exact match)
 *   lands in the junction with zero extra wiring in the wizard itself.
 * - scripts/migrate-project-provinces.ts calls this once to backfill the 32 pre-existing
 *   catalogue rows, twelve of which pack several provinces into one string.
 *
 * `province` itself is untouched and stays the display column — see BACKLOG.md's "Full province
 * data migration" for why a full free-text cleanup is deliberately out of scope here.
 */

import { provinces as canonicalProvinceNames } from "@/lib/data/taxonomies";

const CANONICAL = canonicalProvinceNames.map((name) => ({
  id: name.toLowerCase().replace(/\s+/g, "-"),
  name,
}));

/** Tokens that mean "nationwide"/"not a province" rather than an unresolved province — dropped
 *  silently rather than surfaced as ambiguous. Covers six of the twelve multi-province seed
 *  strings (e.g. "Harare / National"). */
const SKIP_TOKENS = new Set(["national"]);

/** Hand-reviewed resolutions for tokens the automatic exact/prefix match below cannot place —
 *  each one traces back to a specific seed record; see scripts/migrate-project-provinces.ts for
 *  the review report these were read off of.
 *
 *  - "matabeleland" (zim-zida-011, "Midlands / Matabeleland / Masvingo / Manicaland"): the source
 *    deck names the region, not a specific one of the two Matabeleland provinces, for a 500,000-
 *    user rural broadband rollout — genuinely both.
 *  - "hwange area" (zim-zida-029, "Matabeleland North / Hwange area (source deck lists
 *    Mashonaland Central on title slide; requires validation)"): Hwange itself already resolves
 *    via the "Matabeleland North" token beside it in the same string — this second token is the
 *    deck's own title-slide contradiction, a caveat rather than a second province, so it
 *    contributes no additional id.
 */
const TOKEN_OVERRIDES: Record<string, string[]> = {
  matabeleland: ["matabeleland-north", "matabeleland-south"],
  "hwange area": [],
};

/** Reverse of the id derivation above — every consumer that needs to turn a resolved
 *  `provinceIds` entry back into its display name (the filter dropdown, the executive report's
 *  provincial rollup) reads this instead of re-deriving the slug scheme itself. */
export function provinceNameFromId(id: string): string {
  return CANONICAL.find((p) => p.id === id)?.name ?? id;
}

export interface ProvinceResolution {
  /** Canonical province ids (lib/data/taxonomies.ts `provinces`, slugified), de-duplicated. */
  ids: string[];
  /** Tokens that matched neither a canonical province, a skip token, nor an override — surfaced
   *  so a genuinely new ambiguous case is reported rather than silently dropped. */
  unresolved: string[];
}

const EMPTY_RESOLUTION: ProvinceResolution = { ids: [], unresolved: [] };

function stripParenthetical(s: string): string {
  return s.replace(/\([^)]*\)/g, "").trim();
}

/** Splits on "/" (the only separator the seed deck's multi-province strings use), then resolves
 *  each token against the canonical registry — exact match first, then "starts with a canonical
 *  name" (so "Midlands corridor" resolves to Midlands), then the explicit override table above. */
export function resolveProvinceIds(text: string | null | undefined): ProvinceResolution {
  if (!text || !text.trim()) return EMPTY_RESOLUTION;

  const ids = new Set<string>();
  const unresolved: string[] = [];

  const tokens = stripParenthetical(text)
    .split("/")
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (SKIP_TOKENS.has(lower)) continue;

    const exact = CANONICAL.find((p) => p.name.toLowerCase() === lower);
    if (exact) {
      ids.add(exact.id);
      continue;
    }

    const prefixed = CANONICAL.find((p) => lower.startsWith(p.name.toLowerCase()));
    if (prefixed) {
      ids.add(prefixed.id);
      continue;
    }

    if (lower in TOKEN_OVERRIDES) {
      TOKEN_OVERRIDES[lower].forEach((id) => ids.add(id));
      continue;
    }

    unresolved.push(token);
  }

  return { ids: Array.from(ids), unresolved };
}
