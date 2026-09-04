import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { siteSettings } from "@/lib/db/schema";
import { mergeFieldVisibility } from "@/lib/entitlements/matrix";

export async function loadEntitlementContext() {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, "singleton")).limit(1);
  return {
    matrix: mergeFieldVisibility(row?.fieldVisibility),
    costStructureHidden: row?.costStructureHidden ?? false,
  };
}
