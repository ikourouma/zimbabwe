import { HeartPulse, Wheat, Cpu, Factory, Pickaxe, Building2, Zap, Landmark, type LucideIcon } from "lucide-react";

/** No `icon` field exists on `Sector` yet — this keys off the seeded sector ids so the sector
 *  pill row (project registry filter bar, sector grid) can show a recognizable glyph per sector
 *  without adding a data-model field for what is, today, a purely cosmetic concern. */
export const SECTOR_ICONS: Record<string, LucideIcon> = {
  "sec-health": HeartPulse,
  "sec-agriculture": Wheat,
  "sec-ict": Cpu,
  "sec-manufacturing": Factory,
  "sec-mining": Pickaxe,
  "sec-infrastructure": Building2,
  "sec-renewable-energy": Zap,
  "sec-tourism-financial": Landmark,
};

export function getSectorIcon(sectorId: string): LucideIcon {
  return SECTOR_ICONS[sectorId] ?? Building2;
}
