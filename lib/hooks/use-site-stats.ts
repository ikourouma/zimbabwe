"use client";

import { useProjectStore } from "@/context/project-store-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { computeSiteStats } from "@/lib/data/site-stats";

/** Client-side, reactive counterpart to `getSiteStats()` — reads the live project and taxonomy
 *  stores so counts (published projects, sectors, provinces, etc.) update immediately when a
 *  super admin publishes a project or edits a taxonomy, with no rebuild required. */
export function useSiteStats() {
  const { projects } = useProjectStore();
  const { sectors, pillars, provinces, ministries } = useTaxonomyStore();

  return computeSiteStats({ projects, sectors, pillars, provinces, ministries });
}
