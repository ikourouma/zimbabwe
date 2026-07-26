"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Copy, Download, History, Lock } from "lucide-react";
import type { AuditLogEntry } from "@/lib/types";
import { entityTypeLabel } from "@/lib/governance/audit-taxonomy";
import { ROLE_LABELS } from "@/components/dashboard/role-change-modal";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface AuditDetailDrawerProps {
  entry: AuditLogEntry | null;
  onClose: () => void;
}

function MetaRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-xs uppercase tracking-wide shrink-0" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
      <span className={`text-sm text-right break-all ${mono ? "font-mono text-xs" : ""}`} style={{ color: "var(--color-text-secondary)" }}>
        {value}
      </span>
    </div>
  );
}

/**
 * Forensic detail view for a single audit row. Renders a structured metadata grid, a from→to diff
 * inspector (for status/role changes that stamp metadata.from / metadata.to), and raw-payload copy
 * and JSON export. Rollback and actor-session suspension are rendered but disabled — the audit log
 * is append-only and those capabilities are deferred.
 */
export function AuditDetailDrawer({ entry, onClose }: AuditDetailDrawerProps) {
  const [copied, setCopied] = useState(false);

  const meta = entry?.metadata ?? {};
  const from = meta.from as string | undefined;
  const to = meta.to as string | undefined;
  const hasDiff = from !== undefined || to !== undefined;
  const reason = typeof meta.reason === "string" ? meta.reason : typeof meta.notes === "string" ? meta.notes : null;

  const otherMeta = Object.entries(meta).filter(([k]) => !["actorName", "from", "to", "reason", "notes"].includes(k));

  const payload = entry
    ? JSON.stringify(
        {
          id: entry.id,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          actorUserId: entry.actorUserId,
          actorName: entry.actorName,
          createdAt: entry.createdAt,
          metadata: entry.metadata,
        },
        null,
        2
      )
    : "";

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Payload copied");
    } catch {
      toast.error("Could not copy payload");
    }
  };

  const exportJson = () => {
    if (!entry) return;
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${entry.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={Boolean(entry)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        {entry && (
          <>
            <SheetHeader>
              <SheetTitle>{entry.action.replace(/\./g, " → ")}</SheetTitle>
              <SheetDescription>{new Date(entry.createdAt).toLocaleString()}</SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              <div className="dashboard-panel p-3">
                <MetaRow label="Actor" value={entry.actorName ?? "Unknown"} />
                <MetaRow label="Actor Role" value={entry.actorRole ? ROLE_LABELS[entry.actorRole] : "—"} />
                <MetaRow label="Actor ID" value={entry.actorUserId ?? "—"} mono />
                <MetaRow label="Entity" value={entityTypeLabel(entry.entityType)} />
                <MetaRow label="Entity ID" value={entry.entityId} mono />
                <MetaRow label="Timestamp" value={new Date(entry.createdAt).toISOString()} mono />
              </div>

              {hasDiff && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>
                    Change
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="status-badge status-badge-info">{from ?? "—"}</span>
                    <ArrowRight className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
                    <span className="status-badge status-badge-active">{to ?? "—"}</span>
                  </div>
                </div>
              )}

              {reason && (
                <div
                  className="rounded-md px-3 py-2 text-sm italic"
                  style={{ backgroundColor: "rgba(255,211,0,0.08)", color: "#fde047" }}
                >
                  “{reason}”
                </div>
              )}

              {otherMeta.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>
                    Metadata
                  </p>
                  <div className="dashboard-panel p-3">
                    {otherMeta.map(([k, v]) => (
                      <MetaRow key={k} label={k} value={typeof v === "object" ? JSON.stringify(v) : String(v)} />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={copyPayload}>
                  <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy payload"}
                </Button>
                <Button size="sm" variant="secondary" onClick={exportJson}>
                  <Download className="h-3.5 w-3.5" /> Export JSON
                </Button>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>
                  Raw payload
                </p>
                <pre
                  className="text-xs rounded-md p-3 overflow-x-auto"
                  style={{ backgroundColor: "rgba(0,0,0,0.3)", color: "var(--color-text-secondary)", border: "1px solid var(--color-sovereign-border)" }}
                >
                  {payload}
                </pre>
              </div>

              {/* Append-only ledger — remediation actions are deferred, shown disabled so operators
                  know they exist but aren't wired. */}
              <div className="space-y-2">
                <div
                  className="flex items-center gap-2 rounded-md px-3 py-2 opacity-60"
                  style={{ border: "1px dashed var(--color-sovereign-border)", color: "var(--color-text-muted)" }}
                >
                  <History className="h-3.5 w-3.5 shrink-0" /> Roll back this change — deferred (audit log is append-only).
                </div>
                <div
                  className="flex items-center gap-2 rounded-md px-3 py-2 opacity-60"
                  style={{ border: "1px dashed var(--color-sovereign-border)", color: "var(--color-text-muted)" }}
                >
                  <Lock className="h-3.5 w-3.5 shrink-0" /> Suspend actor session — deferred (Neon Auth self-service only).
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
