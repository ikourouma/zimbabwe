"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Briefcase, Search, Send, Users } from "lucide-react";
import { useDealRoomStore } from "@/context/deal-room-store-context";
import { useProjectStore } from "@/context/project-store-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Radix Select reserves the empty string for "no selection", so the default "General Concierge"
// option needs a real sentinel value — mapped back to `undefined` (no explicit desk) on send.
const GENERAL_DESK = "__general__";

interface Directory {
  userId: string;
  name: string;
  role: string;
  organization?: string | null;
}

interface NewMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isStaff: boolean;
  /** Called after a successful send so the hub can refresh its thread list. */
  onSent: () => void;
  /** (Investor only) called when the investor picks one of their engaged projects instead of a
   *  general desk — hands the projectId back to the hub, which switches to the Deals tab and
   *  opens/continues that project's thread rather than sending through /api/concierge/messages. */
  onSelectProjectThread?: (projectId: string) => void;
}

/**
 * Global Communication Hub composer. Investors pick a ZIDA "desk" (case manager), continue their
 * General Concierge thread, or jump straight to one of their engaged projects' deal threads. Staff
 * search the investor directory and fan-out one message to one or many recipients' concierge
 * threads at once. Desk/concierge sends post to /api/concierge/messages.
 */
export function NewMessageModal({ open, onOpenChange, isStaff, onSent, onSelectProjectThread }: NewMessageModalProps) {
  const { engagements } = useDealRoomStore();
  const { getProject } = useProjectStore();
  const [desks, setDesks] = useState<Directory[]>([]);
  const [investors, setInvestors] = useState<Directory[]>([]);
  const [deskId, setDeskId] = useState(GENERAL_DESK);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // Distinct projects the signed-in investor has an engagement on — powers the "Project / Deal
  // Thread" quick-jump list (not applicable to staff, who use the recipient picker below instead).
  const engagedProjects = useMemo(() => {
    if (isStaff) return [];
    const seen = new Set<string>();
    const list: { id: string; title: string }[] = [];
    for (const e of engagements) {
      if (seen.has(e.projectId)) continue;
      seen.add(e.projectId);
      const project = getProject(e.projectId);
      list.push({ id: e.projectId, title: project?.title ?? "Project" });
    }
    return list;
  }, [engagements, getProject, isStaff]);

  useEffect(() => {
    if (!open) return;
    setBody("");
    setDeskId(GENERAL_DESK);
    setSelected(new Set());
    setSearch("");
    // Investors need the ZIDA desk directory; staff need the investor directory to broadcast to.
    const url = isStaff ? "/api/deal-team/investors" : "/api/deal-team";
    (async () => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = (await res.json()) as Directory[];
          if (isStaff) setInvestors(data);
          else setDesks(data);
        }
      } catch {
        /* leave empty; the user can still send a general message */
      }
    })();
  }, [open, isStaff]);

  const filteredInvestors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return investors;
    return investors.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.organization ?? "").toLowerCase().includes(q)
    );
  }, [investors, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canSend = body.trim().length > 0 && (!isStaff || selected.size > 0);

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      if (isStaff) {
        const owners = Array.from(selected);
        const results = await Promise.allSettled(
          owners.map((ownerUserId) =>
            fetch("/api/concierge/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ownerUserId, body: body.trim() }),
            }).then((r) => {
              if (!r.ok) throw new Error();
            })
          )
        );
        const ok = results.filter((r) => r.status === "fulfilled").length;
        if (ok === owners.length) toast.success(`Message sent to ${ok} recipient${ok === 1 ? "" : "s"}`);
        else if (ok > 0) toast.warning(`Sent to ${ok} of ${owners.length} recipients`);
        else throw new Error("All sends failed");
      } else {
        const res = await fetch("/api/concierge/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: body.trim(), recipientUserId: deskId !== GENERAL_DESK ? deskId : undefined }),
        });
        if (!res.ok) throw new Error();
        toast.success("Message sent to the ZIDA team");
      }
      onOpenChange(false);
      onSent();
    } catch {
      toast.error("Could not send the message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>
            {isStaff
              ? "Start a general (project-less) thread with one or more investors."
              : "Send a general question to the ZIDA deal team — optionally routed to a specific desk."}
          </DialogDescription>
        </DialogHeader>

        {isStaff ? (
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Recipients {selected.size > 0 && <span className="text-white">· {selected.size} selected</span>}
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search investors by name or organization…"
                className="dashboard-input h-9 w-full pl-8"
              />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md" style={{ border: "1px solid var(--color-sovereign-border)" }}>
              {filteredInvestors.length === 0 ? (
                <p className="p-3 text-xs italic" style={{ color: "var(--color-text-muted)" }}>
                  <Users className="h-3.5 w-3.5 inline mr-1" /> No matching users.
                </p>
              ) : (
                filteredInvestors.map((i) => (
                  <label
                    key={i.userId}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <input type="checkbox" checked={selected.has(i.userId)} onChange={() => toggle(i.userId)} />
                    <span className="text-sm text-white">{i.name}</span>
                    {i.organization && (
                      <span className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                        · {i.organization}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] uppercase tracking-wide capitalize" style={{ color: "var(--color-text-muted)" }}>
                      {i.role}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Route to desk (optional)
              </label>
              <Select value={deskId} onValueChange={setDeskId}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENERAL_DESK}>General Concierge &amp; Platform Support</SelectItem>
                  {desks.map((d) => (
                    <SelectItem key={d.userId} value={d.userId}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {engagedProjects.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Or continue a project / deal thread
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {engagedProjects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onSelectProjectThread?.(p.id);
                        onOpenChange(false);
                      }}
                      className="btn-sovereign-ghost text-xs px-2.5 py-1.5 inline-flex items-center gap-1.5"
                    >
                      <Briefcase className="h-3 w-3" /> {p.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Type your message…"
            className="dashboard-input w-full"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button size="sm" onClick={send} disabled={!canSend || sending}>
            <Send className="h-3.5 w-3.5" /> {sending ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
