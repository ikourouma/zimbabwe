"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import type { Announcement, AnnouncementAudience, AnnouncementStatus, AnnouncementStyle } from "@/lib/types";
import { useAnnouncements } from "@/lib/hooks/use-announcements";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: "Everyone",
  registered: "Registered users",
  qualified: "Qualified investors",
  government: "Government",
  admin: "Admins",
  super_admin: "Super admins",
};

const STYLE_LABELS: Record<AnnouncementStyle, string> = {
  info: "Info",
  success: "Success",
  warning: "Warning",
  critical: "Critical",
};

const STATUS_LABELS: Record<AnnouncementStatus, string> = {
  active: "Active",
  draft: "Draft",
  archived: "Archived",
};

interface DraftForm {
  title: string;
  body: string;
  audienceRole: AnnouncementAudience;
  style: AnnouncementStyle;
  priority: number;
  startsAt: string;
  endsAt: string;
  dismissable: boolean;
  ctaLabel: string;
  ctaHref: string;
  status: AnnouncementStatus;
}

/** ISO → value for <input type="datetime-local"> (local time, no seconds/zone). */
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
    audienceRole: "all",
    style: "info",
    priority: 0,
    startsAt: toLocalInput(new Date().toISOString()),
    endsAt: "",
    dismissable: true,
    ctaLabel: "",
    ctaHref: "",
    status: "active",
  };
}

function fromAnnouncement(a: Announcement): DraftForm {
  return {
    title: a.title,
    body: a.body,
    audienceRole: a.audienceRole,
    style: a.style,
    priority: a.priority,
    startsAt: toLocalInput(a.startsAt),
    endsAt: toLocalInput(a.endsAt),
    dismissable: a.dismissable,
    ctaLabel: a.ctaLabel ?? "",
    ctaHref: a.ctaHref ?? "",
    status: a.status,
  };
}

export function AnnouncementsManager() {
  const { announcements, isLoading, refresh } = useAnnouncements(true);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<DraftForm | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
  };
  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm(fromAnnouncement(a));
  };
  const close = () => {
    setForm(null);
    setEditing(null);
  };

  const save = async () => {
    if (!form) return;
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      body: form.body,
      audienceRole: form.audienceRole,
      style: form.style,
      priority: Number(form.priority) || 0,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : new Date().toISOString(),
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      dismissable: form.dismissable,
      ctaLabel: form.ctaLabel || null,
      ctaHref: form.ctaHref || null,
      status: form.status,
    };
    try {
      const res = await fetch(editing ? `/api/announcements/${editing.id}` : "/api/announcements", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? "Announcement updated" : "Announcement published");
      close();
      await refresh();
    } catch {
      toast.error("Could not save the announcement.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: Announcement) => {
    try {
      const res = await fetch(`/api/announcements/${a.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Announcement deleted");
      await refresh();
    } catch {
      toast.error("Could not delete the announcement.");
    }
  };

  return (
    <section className="dashboard-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Megaphone className="h-4 w-4" style={{ color: "var(--color-gold)" }} /> Announcements
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Scheduled, audience-targeted banners. Higher priority shows first; multiple can stack.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> New announcement
        </Button>
      </div>

      {isLoading ? (
        <div className="dashboard-skeleton h-4 w-full" />
      ) : announcements.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: "var(--color-text-muted)" }}>
          No announcements yet. Create one to show a sitewide banner.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Audience</th>
                <th>Style</th>
                <th>Priority</th>
                <th>Window</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((a) => (
                <tr key={a.id}>
                  <td className="text-white font-medium max-w-[220px] truncate" title={a.title}>
                    {a.title}
                  </td>
                  <td>{AUDIENCE_LABELS[a.audienceRole]}</td>
                  <td className="capitalize">{STYLE_LABELS[a.style]}</td>
                  <td>{a.priority}</td>
                  <td className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(a.startsAt).toLocaleDateString()} → {a.endsAt ? new Date(a.endsAt).toLocaleDateString() : "∞"}
                  </td>
                  <td>{STATUS_LABELS[a.status]}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(a)}>
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
            <DialogTitle>{editing ? "Edit announcement" : "New announcement"}</DialogTitle>
            <DialogDescription>Configure the message, audience, style, and active window.</DialogDescription>
          </DialogHeader>

          {form && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="dashboard-input" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Message</label>
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={2} className="dashboard-input" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Audience</label>
                  <select value={form.audienceRole} onChange={(e) => setForm({ ...form, audienceRole: e.target.value as AnnouncementAudience })} className="dashboard-input">
                    {(Object.keys(AUDIENCE_LABELS) as AnnouncementAudience[]).map((a) => (
                      <option key={a} value={a} style={{ background: "#0a140a" }}>{AUDIENCE_LABELS[a]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Style</label>
                  <select value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value as AnnouncementStyle })} className="dashboard-input">
                    {(Object.keys(STYLE_LABELS) as AnnouncementStyle[]).map((s) => (
                      <option key={s} value={s} style={{ background: "#0a140a" }}>{STYLE_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Priority</label>
                  <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="dashboard-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AnnouncementStatus })} className="dashboard-input">
                    {(Object.keys(STATUS_LABELS) as AnnouncementStatus[]).map((s) => (
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
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>CTA label (optional)</label>
                  <input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} className="dashboard-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>CTA link (optional)</label>
                  <input value={form.ctaHref} onChange={(e) => setForm({ ...form, ctaHref: e.target.value })} className="dashboard-input" placeholder="/platform" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                <input type="checkbox" checked={form.dismissable} onChange={(e) => setForm({ ...form, dismissable: e.target.checked })} className="h-3.5 w-3.5" />
                Allow visitors to dismiss this banner
              </label>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={close} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
