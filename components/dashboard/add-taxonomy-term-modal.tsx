"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { TAXONOMY_CATEGORY_LABELS, type TaxonomyCategory } from "@/lib/governance/taxonomy-filters";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Single adaptive "Add Term" modal — replaces the five separate "New <thing> name" inline forms
 *  that used to float at the bottom of each taxonomy tab. Field set switches on `category`; UN
 *  SDGs never reach this modal (the utility bar disables "Add Term" on that read-only category). */
export function AddTaxonomyTermModal({
  category,
  open,
  onOpenChange,
}: {
  category: TaxonomyCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addSector, addMinistry, addProvince, addPillar, addContactReason } = useTaxonomyStore();
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [routingCategory, setRoutingCategory] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setShortName("");
      setRoutingCategory("");
      setSaving(false);
    }
  }, [open, category]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error(category === "contact" ? "Reason label is required" : "Name is required");
      return;
    }
    if (category === "ministries" && !shortName.trim()) {
      toast.error("Short name is required");
      return;
    }

    setSaving(true);
    try {
      switch (category) {
        case "sectors":
          await addSector({ name: name.trim() });
          break;
        case "ministries":
          await addMinistry({ name: name.trim(), shortName: shortName.trim(), type: "beneficiary", status: "pending_validation" });
          break;
        case "provinces":
          await addProvince(name.trim());
          break;
        case "pillars":
          await addPillar({ name: name.trim() });
          break;
        case "contact":
          await addContactReason({ label: name.trim(), routingCategory: routingCategory.trim() || undefined });
          break;
        case "sdgs":
          toast.error("UN SDGs are a fixed global standard and cannot be added.");
          return;
      }
      toast.success(`${TAXONOMY_CATEGORY_LABELS[category]} term added`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add term");
    } finally {
      setSaving(false);
    }
  };

  const nameLabel = category === "contact" ? "Reason label" : category === "ministries" ? "Ministry name" : "Name";
  const namePlaceholder =
    category === "sectors"
      ? "e.g. Renewable Energy"
      : category === "ministries"
        ? "e.g. Ministry of Energy and Power Development"
        : category === "provinces"
          ? "e.g. Matabeleland North"
          : category === "pillars"
            ? "e.g. Infrastructure & Logistics"
            : "e.g. Investment inquiry";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add {TAXONOMY_CATEGORY_LABELS[category].replace(/s$/, "")} term</DialogTitle>
          <DialogDescription>
            New {TAXONOMY_CATEGORY_LABELS[category].toLowerCase()} entries are immediately available to every project editor
            platform-wide.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              {nameLabel}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={namePlaceholder}
              className="dashboard-input"
              autoFocus
            />
          </div>
          {category === "ministries" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Short name
              </label>
              <input
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="e.g. MOEPD"
                className="dashboard-input"
              />
            </div>
          )}
          {category === "contact" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Routing category (optional)
              </label>
              <input
                value={routingCategory}
                onChange={(e) => setRoutingCategory(e.target.value)}
                placeholder="e.g. investment_inquiry"
                className="dashboard-input"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving ? "Adding…" : "Add term"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
