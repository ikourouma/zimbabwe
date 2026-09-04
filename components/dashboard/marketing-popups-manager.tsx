"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MessageSquarePlus, Pencil, Plus, Trash2 } from "lucide-react";
import type { MarketingPopup, MarketingPopupStatus } from "@/lib/types";
import { useMarketingPopups } from "@/lib/hooks/use-marketing-popups";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const STATUS_LABELS: Record<MarketingPopupStatus, string> = {
  active: "Active",
  draft: "Draft",
  archived: "Archived",
};

interface DraftForm {
  title: string;
  body: string;
  subtext: string;
  imageUrl: string;
  linkHref: string;
  linkLabel: string;
  priority: number;
  startsAt: string;
  endsAt: string;
  status: MarketingPopupStatus;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(): DraftForm {
  return {
    title: "",
    body: "",
    subtext: "",
    imageUrl: "",
    linkHref: "",
    linkLabel: "",
    priority: 0,
    startsAt: toLocalInput(new Date().toISOString()),
    endsAt: "",
    status: "draft",
  };
}

function fromPopup(p: MarketingPopup): DraftForm {
  return {
    title: p.title,
    body: p.body,
    subtext: p.subtext ?? "",
    imageUrl: p.imageUrl ?? "",
    linkHref: p.linkHref ?? "",
    linkLabel: p.linkLabel ?? "",
    priority: p.priority,
    startsAt: toLocalInput(p.startsAt),
    endsAt: toLocalInput(p.endsAt),
    status: p.status,
  };
}

export function MarketingPopupsManager() {
  const { popups, isLoading, refresh } = useMarketingPopups(true);
  const [editing, setEditing] = useState<MarketingPopup | null>(null);
  const [form, setForm] = useState<DraftForm | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
  };
  const openEdit = (p: MarketingPopup) => {
    setEditing(p);
    setForm(fromPopup(p));
  };
  const close = () => {
    setForm(null);
    setEditing(null);
  };

  const save = async () => {
    if (!form) return;
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and text are required.");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      body: form.body,
      subtext: form.subtext || null,
      imageUrl: form.imageUrl || null,
      linkHref: form.linkHref || null,
      linkLabel: form.linkLabel || null,
      priority: Number(form.priority) || 0,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : new Date().toISOString(),
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      status: form.status,
    };
    try {
      const res = await fetch(editing ? `/api/marketing-popups/${editing.id}` : "/api/marketing-popups", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? "Popup updated" : "Popup saved");
      close();
      await refresh();
    } catch {
      toast.error("Could not save the popup.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: MarketingPopup) => {
    try {
      const res = await fetch(`/api/marketing-popups/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Popup deleted");
      await refresh();
    } catch {
      toast.error("Could not delete the popup.");
    }
  };

  return (
    <section className="dashboard-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <MessageSquarePlus className="h-4 w-4" style={{ color: "var(--color-gold)" }} /> Marketing popups
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Dismissible public-site modals (image, text, sub-text, link). Shown once per browser session.
            Never appears inside admin, super-admin, deal-room, or ministry consoles.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> New popup
        </Button>
      </div>

      {isLoading ? (
        <div className="dashboard-skeleton h-4 w-full" />
      ) : popups.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: "var(--color-text-muted)" }}>
          No marketing popups yet. Create one to show a public-site modal.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Priority</th>
                <th>Window</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {popups.map((p) => (
                <tr key={p.id}>
                  <td className="text-white font-medium max-w-[240px] truncate" title={p.title}>
                    {p.title}
                  </td>
                  <td>{p.priority}</td>
                  <td className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(p.startsAt).toLocaleDateString()} → {p.endsAt ? new Date(p.endsAt).toLocaleDateString() : "∞"}
                  </td>
                  <td>{STATUS_LABELS[p.status]}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(p)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(form)} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit marketing popup" : "New marketing popup"}</DialogTitle>
            <DialogDescription>Configure the image, copy, link, and active window.</DialogDescription>
          </DialogHeader>

          {form && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="dashboard-input" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Text *</label>
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} className="dashboard-input" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Sub-text</label>
                <input value={form.subtext} onChange={(e) => setForm({ ...form, subtext: e.target.value })} className="dashboard-input" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Image URL</label>
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="dashboard-input"
                  placeholder="https://… or /coat-of-arms.png"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Link label</label>
                  <input value={form.linkLabel} onChange={(e) => setForm({ ...form, linkLabel: e.target.value })} className="dashboard-input" placeholder="Learn more" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Link URL</label>
                  <input value={form.linkHref} onChange={(e) => setForm({ ...form, linkHref: e.target.value })} className="dashboard-input" placeholder="/contact" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Priority</label>
                  <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="dashboard-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MarketingPopupStatus })} className="dashboard-input">
                    {(Object.keys(STATUS_LABELS) as MarketingPopupStatus[]).map((s) => (
                      <option key={s} value={s} style={{ background: "#0a140a" }}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Starts</label>
                  <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="dashboard-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Ends (optional)</label>
                  <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="dashboard-input" />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={close} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Save popup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
