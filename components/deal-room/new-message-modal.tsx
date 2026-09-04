"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Briefcase, Search, Send, Users } from "lucide-react";
import { useAuth } from "@/context/auth-context";
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NO_SUBJECT, OTHER_SUBJECT, SUBJECT_OPTIONS, resolveSubject } from "@/lib/governance/message-subjects";
import { cn } from "@/lib/utils";

// Radix Select reserves the empty string for "no selection", so the default "General Concierge"
// option needs a real sentinel value — mapped back to `undefined` (no explicit desk) on send.
const GENERAL_DESK = "__general__";

// Ministry Message Recipient Targeting plan — same sentinel idea for the ministry_admin "To"
// picker's default "no specific recipient" state.
const GENERAL_RECIPIENT = "__general__";

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
  /** Full Persona Communication Parity plan — a `government` caller gets two extra composer modes
   *  layered on top of the existing staff broadcast tool: "Message ZIDA / My Ministry" (their own
   *  General Concierge thread, optionally routed to a named admin/super_admin or their own
   *  ministry_admin) and the pre-existing "Message an investor" broadcast. */
  isGovernment?: boolean;
  /** Called after a successful send so the hub can refresh its thread list. */
  onSent: () => void;
  /** (Investor only) called when the investor picks one of their engaged projects instead of a
   *  general desk — hands the projectId back to the hub, which switches to the Deals tab and
   *  opens/continues that project's thread rather than sending through /api/concierge/messages. */
  onSelectProjectThread?: (projectId: string) => void;
  /** Ministry Desk management dashboard plan, Part 3 — when set, this is a ministry_admin: there's
   *  no general concierge channel for them (that stays investor<->ZIDA) and the recipient-search
   *  picker above is a broadcast tool that doesn't apply either, so the default mode is this "pick
   *  one of your ministry's projects" list (reusing the investor's engagedProjects button UI,
   *  sourced from every one of the ministry's projects rather than only ones with an engagement).
   *  Full Persona Communication Parity plan adds a second mode alongside it: "Escalate to ZIDA" —
   *  their own General Concierge thread, for issues that aren't about one specific project. */
  ministryProjectOptions?: { id: string; title: string }[];
}

/**
 * Global Communication Hub composer. Investors pick a ZIDA "desk" (case manager), continue their
 * General Concierge thread, or jump straight to one of their engaged projects' deal threads. Staff
 * search the investor directory and fan-out one message to one or many recipients' concierge
 * threads at once. Desk/concierge sends post to /api/concierge/messages.
 */
export function NewMessageModal({
  open,
  onOpenChange,
  isStaff,
  isGovernment = false,
  onSent,
  onSelectProjectThread,
  ministryProjectOptions,
}: NewMessageModalProps) {
  const isMinistryPicker = Boolean(ministryProjectOptions);
  const { userId } = useAuth();
  const { engagements } = useDealRoomStore();
  const { getProject } = useProjectStore();
  const [desks, setDesks] = useState<Directory[]>([]);
  const [investors, setInvestors] = useState<Directory[]>([]);
  const [deskId, setDeskId] = useState(GENERAL_DESK);
  const [ministryProjectId, setMinistryProjectId] = useState("");
  // Ministry Message Recipient Targeting plan — the "To" directory, split into the ministry-wide
  // part (government officials in my ministry + ZIDA admin/super_admin, fetched once) and the
  // per-project part (investors engaged on whichever project is currently selected).
  const [ministryDirectory, setMinistryDirectory] = useState<{ government: Directory[]; staff: Directory[] }>({
    government: [],
    staff: [],
  });
  const [ministryInvestors, setMinistryInvestors] = useState<Directory[]>([]);
  const [ministryRecipientId, setMinistryRecipientId] = useState(GENERAL_RECIPIENT);
  // Full Persona Communication Parity plan — ministry_admin's second compose mode: "Escalate to
  // ZIDA" posts into their own General Concierge thread instead of a project thread, optionally
  // routed to a named ZIDA staffer (reuses the same ministryDirectory.staff fetched above).
  const [ministryMode, setMinistryMode] = useState<"project" | "escalate">("project");
  const [escalateRecipientId, setEscalateRecipientId] = useState(GENERAL_RECIPIENT);
  // Full Persona Communication Parity plan — government's second compose mode: "Message ZIDA / My
  // Ministry" posts into their own General Concierge thread (same shape as the investor's "Route
  // to desk" picker below), sourced from /api/deal-team, which now also lists their own ministry's
  // ministry_admin(s) alongside ZIDA admin/super_admin.
  const [govMode, setGovMode] = useState<"zida" | "investors">("zida");
  const [govDesks, setGovDesks] = useState<Directory[]>([]);
  const [govDeskId, setGovDeskId] = useState(GENERAL_DESK);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [subjectOption, setSubjectOption] = useState<string>(NO_SUBJECT);
  const [subjectOther, setSubjectOther] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const resolvedSubject = resolveSubject(subjectOption, subjectOther);

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
    setMinistryProjectId("");
    setMinistryRecipientId(GENERAL_RECIPIENT);
    setMinistryInvestors([]);
    setMinistryMode("project");
    setEscalateRecipientId(GENERAL_RECIPIENT);
    setGovMode("zida");
    setGovDeskId(GENERAL_DESK);
    setSelected(new Set());
    setSearch("");
    setSubjectOption(NO_SUBJECT);
    setSubjectOther("");
    if (isMinistryPicker) {
      // Ministry-wide "To" groups (government + ZIDA staff) don't depend on which project is
      // picked — load them once per open; the investor group loads separately, per project. The
      // same ZIDA-staff group also powers the "Escalate to ZIDA" mode's recipient picker.
      (async () => {
        try {
          const res = await fetch("/api/ministry/recipients");
          if (res.ok) setMinistryDirectory(await res.json());
        } catch {
          /* leave empty; the user can still send a general project message */
        }
      })();
      return;
    }
    if (isGovernment) {
      // Government needs both directories up front: the investor directory (for "Message an
      // investor" mode) and the deal-team desk directory (for "Message ZIDA / My Ministry" mode).
      (async () => {
        try {
          const [investorsRes, deskRes] = await Promise.all([
            fetch("/api/deal-team/investors"),
            fetch("/api/deal-team"),
          ]);
          if (investorsRes.ok) setInvestors(await investorsRes.json());
          if (deskRes.ok) setGovDesks(await deskRes.json());
        } catch {
          /* leave empty; the user can still send a general message */
        }
      })();
      return;
    }
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
  }, [open, isStaff, isMinistryPicker, isGovernment]);

  // Ministry Message Recipient Targeting plan — the "Investors" recipient group is scoped to
  // whichever project is currently selected, so it must be refetched (and any stale selection
  // cleared) every time that changes.
  useEffect(() => {
    setMinistryRecipientId(GENERAL_RECIPIENT);
    if (!isMinistryPicker || !ministryProjectId) {
      setMinistryInvestors([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${ministryProjectId}/engaged-investors`);
        if (res.ok && !cancelled) setMinistryInvestors(await res.json());
      } catch {
        /* leave empty; the recipient picker just falls back to "General" */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ministryProjectId, isMinistryPicker]);

  const filteredInvestors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return investors;
    return investors.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.organization ?? "").toLowerCase().includes(q)
    );
  }, [investors, search]);

  // Grouped, not lumped together as one undifferentiated "Investor" bucket — a government reviewer
  // is a different constituency from an actual investor in this staff-facing recipient picker (Team
  // Ministry Traceability Batch, Phase 6, item 7).
  const groupedInvestors = useMemo(() => {
    const government = filteredInvestors.filter((i) => i.role === "government");
    const investorRows = filteredInvestors.filter((i) => i.role !== "government");
    const groups: { label: string; rows: Directory[] }[] = [];
    if (investorRows.length > 0) groups.push({ label: "Investors", rows: investorRows });
    if (government.length > 0) groups.push({ label: "Government", rows: government });
    return groups;
  }, [filteredInvestors]);

  // Government's "Message ZIDA / My Ministry" desk directory, grouped the same way — their own
  // ministry_admin(s) surfaced first as the natural first line of escalation, ZIDA staff second.
  const groupedGovDesks = useMemo(() => {
    const ministryAdmins = govDesks.filter((d) => d.role === "ministry_admin");
    const zidaStaff = govDesks.filter((d) => d.role === "admin" || d.role === "super_admin");
    const groups: { label: string; rows: Directory[] }[] = [];
    if (ministryAdmins.length > 0) groups.push({ label: "My Ministry Desk", rows: ministryAdmins });
    if (zidaStaff.length > 0) groups.push({ label: "ZIDA Staff", rows: zidaStaff });
    return groups;
  }, [govDesks]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canSend = (() => {
    if (body.trim().length === 0) return false;
    if (isMinistryPicker) return ministryMode === "escalate" ? true : Boolean(ministryProjectId);
    if (isGovernment && govMode === "zida") return true;
    return !isStaff || selected.size > 0;
  })();

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      if (isMinistryPicker && ministryMode === "escalate") {
        // No explicit ownerUserId — app/api/concierge/messages/route.ts's ministry_admin branch
        // defaults an omitted/self ownerUserId to the caller's own thread.
        const res = await fetch("/api/concierge/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: body.trim(),
            subject: resolvedSubject,
            recipientUserId: escalateRecipientId !== GENERAL_RECIPIENT ? escalateRecipientId : undefined,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("Message sent to ZIDA");
      } else if (isMinistryPicker) {
        const res = await fetch(`/api/projects/${ministryProjectId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: body.trim(),
            subject: resolvedSubject,
            recipientUserId: ministryRecipientId !== GENERAL_RECIPIENT ? ministryRecipientId : undefined,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("Message sent");
        onSelectProjectThread?.(ministryProjectId);
      } else if (isGovernment && govMode === "zida") {
        // Government is staff-flagged server-side, so unlike ministry_admin's self-default above,
        // an explicit ownerUserId is required here — omitting it would 400.
        const res = await fetch("/api/concierge/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerUserId: userId,
            body: body.trim(),
            subject: resolvedSubject,
            recipientUserId: govDeskId !== GENERAL_DESK ? govDeskId : undefined,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("Message sent");
      } else if (isStaff) {
        const owners = Array.from(selected);
        const results = await Promise.allSettled(
          owners.map((ownerUserId) =>
            fetch("/api/concierge/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ownerUserId, subject: resolvedSubject, body: body.trim() }),
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
          body: JSON.stringify({
            body: body.trim(),
            subject: resolvedSubject,
            recipientUserId: deskId !== GENERAL_DESK ? deskId : undefined,
          }),
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>
            {isMinistryPicker
              ? ministryMode === "escalate"
                ? "Send a general question or issue to the ZIDA team — optionally routed to a named staffer."
                : "Select one of your ministry's projects, then send a message to start or continue its communication thread."
              : isGovernment
                ? govMode === "zida"
                  ? "Send a general question to ZIDA or your own ministry desk — optionally routed to a specific recipient."
                  : "Start a general (project-less) thread with one or more investors."
                : isStaff
                  ? "Start a general (project-less) thread with one or more investors."
                  : "Send a general question to the ZIDA deal team — optionally routed to a specific desk."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isMinistryPicker ? (
            <>
              <ModeToggle
                options={[
                  { id: "project", label: "Project message" },
                  { id: "escalate", label: "Escalate to ZIDA" },
                ]}
                value={ministryMode}
                onChange={(v) => setMinistryMode(v as "project" | "escalate")}
              />
              {ministryMode === "escalate" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    To (optional)
                  </label>
                  <Select value={escalateRecipientId} onValueChange={setEscalateRecipientId}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={GENERAL_RECIPIENT}>General (ZIDA Admin team)</SelectItem>
                      {ministryDirectory.staff.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>ZIDA Staff</SelectLabel>
                          {ministryDirectory.staff.map((s) => (
                            <SelectItem key={s.userId} value={s.userId}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    Project
                  </label>
                  {ministryProjectOptions!.length === 0 ? (
                    <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>
                      No projects are tied to your ministry yet.
                    </p>
                  ) : (
                    <Select value={ministryProjectId} onValueChange={setMinistryProjectId}>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Choose a project…" />
                      </SelectTrigger>
                      <SelectContent>
                        {ministryProjectOptions!.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {ministryProjectId && (
                    <div className="space-y-1.5 pt-1.5">
                      <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                        To (optional)
                      </label>
                      <Select value={ministryRecipientId} onValueChange={setMinistryRecipientId}>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={GENERAL_RECIPIENT}>General (visible to everyone on this thread)</SelectItem>
                          {ministryInvestors.length > 0 && (
                            <SelectGroup>
                              <SelectLabel>Investors</SelectLabel>
                              {ministryInvestors.map((i) => (
                                <SelectItem key={i.userId} value={i.userId}>
                                  {i.name}
                                  {i.organization ? ` · ${i.organization}` : ""}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                          {ministryDirectory.government.length > 0 && (
                            <SelectGroup>
                              <SelectLabel>Government (my ministry)</SelectLabel>
                              {ministryDirectory.government.map((g) => (
                                <SelectItem key={g.userId} value={g.userId}>
                                  {g.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                          {ministryDirectory.staff.length > 0 && (
                            <SelectGroup>
                              <SelectLabel>ZIDA Staff</SelectLabel>
                              {ministryDirectory.staff.map((s) => (
                                <SelectItem key={s.userId} value={s.userId}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : isGovernment ? (
            <>
              <ModeToggle
                options={[
                  { id: "zida", label: "Message ZIDA / My Ministry" },
                  { id: "investors", label: "Message an investor" },
                ]}
                value={govMode}
                onChange={(v) => setGovMode(v as "zida" | "investors")}
              />
              {govMode === "zida" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    Route to (optional)
                  </label>
                  <Select value={govDeskId} onValueChange={setGovDeskId}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={GENERAL_DESK}>General (ZIDA Admin team)</SelectItem>
                      {groupedGovDesks.map((group) => (
                        <SelectGroup key={group.label}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.rows.map((d) => (
                            <SelectItem key={d.userId} value={d.userId}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
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
                    {groupedInvestors.length === 0 ? (
                      <p className="p-3 text-xs italic" style={{ color: "var(--color-text-muted)" }}>
                        <Users className="h-3.5 w-3.5 inline mr-1" /> No matching users.
                      </p>
                    ) : (
                      groupedInvestors.map((group) => (
                        <div key={group.label}>
                          <p
                            className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide sticky top-0"
                            style={{ color: "var(--color-text-muted)", backgroundColor: "var(--color-sovereign-panel)" }}
                          >
                            {group.label}
                          </p>
                          {group.rows.map((i) => (
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
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          ) : isStaff ? (
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
                {groupedInvestors.length === 0 ? (
                  <p className="p-3 text-xs italic" style={{ color: "var(--color-text-muted)" }}>
                    <Users className="h-3.5 w-3.5 inline mr-1" /> No matching users.
                  </p>
                ) : (
                  groupedInvestors.map((group) => (
                    <div key={group.label}>
                      <p
                        className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide sticky top-0"
                        style={{ color: "var(--color-text-muted)", backgroundColor: "var(--color-sovereign-panel)" }}
                      >
                        {group.label}
                      </p>
                      {group.rows.map((i) => (
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
                      ))}
                    </div>
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
              Subject (optional)
            </label>
            <Select value={subjectOption} onValueChange={setSubjectOption}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Choose a subject…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SUBJECT}>No subject</SelectItem>
                {SUBJECT_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subjectOption === OTHER_SUBJECT && (
              <input
                value={subjectOther}
                onChange={(e) => setSubjectOther(e.target.value)}
                placeholder="Describe the subject…"
                className="dashboard-input h-9 w-full"
                maxLength={140}
              />
            )}
          </div>

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

/** Small segmented control for the government/ministry_admin dual-mode composer. */
function ModeToggle({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      className="inline-flex rounded-md p-0.5 gap-0.5"
      style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "text-xs px-3 py-1.5 rounded transition-colors",
              active ? "text-white" : "hover:bg-white/5"
            )}
            style={{
              backgroundColor: active ? "rgba(0,100,0,0.35)" : "transparent",
              color: active ? "#fff" : "var(--color-text-muted)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
