"use client";

import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { useSiteSettings } from "@/context/site-settings-context";
import { ENTITLEMENT_GROUP_IDS, ENTITLEMENT_GROUPS, type EntitlementGroupId } from "@/lib/entitlements/matrix";
import type { AccessLevel } from "@/lib/entitlements/visibility";
import { cn } from "@/lib/utils";

const ACCESS_LEVEL_ORDER: AccessLevel[] = ["public", "registered", "qualified", "admin"];
const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  public: "Public",
  registered: "Registered",
  qualified: "Qualified",
  admin: "Admin",
};

function levelMeets(level: AccessLevel, required: AccessLevel) {
  return ACCESS_LEVEL_ORDER.indexOf(level) >= ACCESS_LEVEL_ORDER.indexOf(required);
}

export function EntitlementMatrixManager() {
  const { fieldVisibility, setFieldVisibility, costStructureHidden, setCostStructureHidden, isLoading } = useSiteSettings();

  const setGroupLevel = async (id: EntitlementGroupId, level: AccessLevel) => {
    try {
      await setFieldVisibility({ ...fieldVisibility, [id]: level });
      toast.success(`${ENTITLEMENT_GROUPS[id].label} now requires ${ACCESS_LEVEL_LABELS[level]}`);
    } catch {
      toast.error("Failed to update entitlement");
    }
  };

  return (
    <section className="dashboard-panel p-5">
      <h2 className="text-sm font-semibold text-white mb-1">Entitlement Management</h2>
      <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
        Field-level show/hide by access tier (spec Section H). Changing a row updates the live
        sanitize rules on project APIs. Cost Structure still has a sitewide kill switch.
      </p>
      <div className="overflow-x-auto">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Field Group</th>
              {ACCESS_LEVEL_ORDER.map((level) => (
                <th key={level} className="text-center">{ACCESS_LEVEL_LABELS[level]}</th>
              ))}
              <th>Minimum tier</th>
            </tr>
          </thead>
          <tbody>
            {ENTITLEMENT_GROUP_IDS.map((id) => {
              const group = ENTITLEMENT_GROUPS[id];
              const required = fieldVisibility[id];
              const rowHidden = id === "financialsE1" && costStructureHidden;
              return (
                <tr key={id}>
                  <td className="font-medium text-white">
                    {group.label}
                    {rowHidden && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(255,211,0,0.15)", color: "#fde047" }}>
                        Hidden sitewide
                      </span>
                    )}
                  </td>
                  {ACCESS_LEVEL_ORDER.map((level) => {
                    const meets = levelMeets(level, required) && !rowHidden;
                    return (
                      <td key={level} className="text-center">
                        {meets ? (
                          <Check className="h-4 w-4 inline" style={{ color: "#4ade80" }} />
                        ) : (
                          <X className={cn("h-4 w-4 inline")} style={{ color: "var(--color-text-muted)", opacity: 0.5 }} />
                        )}
                      </td>
                    );
                  })}
                  <td>
                    <select
                      className="dashboard-input text-xs"
                      value={required}
                      disabled={isLoading}
                      onChange={(e) => setGroupLevel(id, e.target.value as AccessLevel)}
                    >
                      {ACCESS_LEVEL_ORDER.map((level) => (
                        <option key={level} value={level}>{ACCESS_LEVEL_LABELS[level]}</option>
                      ))}
                    </select>
                    {id === "financialsE1" && (
                      <button
                        type="button"
                        className="mt-2 text-[11px] underline"
                        style={{ color: "var(--color-gold)" }}
                        onClick={() => {
                          setCostStructureHidden(!costStructureHidden);
                          toast.success(costStructureHidden ? "Cost Structure shown sitewide" : "Cost Structure hidden sitewide");
                        }}
                      >
                        {costStructureHidden ? "Clear sitewide hide" : "Hide cost structure sitewide"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
