"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Clock, Download, Link2, MessageSquareText, Plus, Printer, UserCheck } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useDealRoomStore } from "@/context/deal-room-store-context";
import { useProjectStore } from "@/context/project-store-context";
import { useCommunicationHub } from "@/lib/hooks/use-communication-hub";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";
import { timeAgo } from "@/components/dashboard/activity-feed";
import { MessageThread } from "@/components/deal-room/message-thread";
import { NewMessageModal } from "@/components/deal-room/new-message-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCapitalHeadline } from "@/lib/utils/capital";
import type { ProjectMessageWithProject } from "@/lib/types";

const LAST_SEEN_KEY = "zimbabwe.dashboard.communicationHub.lastSeen";

type ThreadCategory = "general" | "deals" | "engagements";

interface Thread {
  key: string;
  kind: "project" | "concierge";
  category: ThreadCategory;
  title: string;
  subtitle: string;
  projectId?: string;
  engagementId?: string;
  ownerUserId?: string | null;
  latest?: ProjectMessageWithProject;
  count: number;
}

type ScopeFilter = "all" | ThreadCategory;

const SCOPE_TABS: { id: ScopeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "general", label: "General" },
  { id: "deals", label: "Active Deals" },
  { id: "engagements", label: "Engagements" },
];

/**
 * The Communication Hub — one thread list across every channel the signed-in user can see (the
 * project-less General Concierge channel, per-project general questions, and engagement threads),
 * mirrored into the Deal Room, Admin, and Super Admin consoles (one shared component, role-scoped
 * content). Scope tabs filter the list; investors can always start a General Concierge thread.
 */
export function CommunicationHubView() {
  const { userId, isAdmin, isGovernment, isMinistryAdmin, ministryId } = useAuth();
  const isStaff = isAdmin || isGovernment || isMinistryAdmin;
  const { messages, isLoading, refresh } = useCommunicationHub();
  const { engagements } = useDealRoomStore();
  const { projects, getProject } = useProjectStore();
  // Ministry Desk management dashboard plan, Part 3 — no concierge channel for ministry_admin
  // (that stays investor<->ZIDA), so "New Message" gets a project picker instead of the staff
  // broadcast tool / investor desk-routing dropdown. fetchMessagesForActor already ministry-scopes
  // the thread list itself; this just needs the full set of ministry projects to start a new one.
  const ministryProjectOptions = useMemo(
    () =>
      isMinistryAdmin && ministryId
        ? projects
            .filter((p) => projectMatchesMinistry(p, ministryId))
            .map((p) => ({ id: p.id, title: p.title }))
        : undefined,
    [isMinistryAdmin, ministryId, projects]
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [lastSeen, setLastSeen] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  // Set when the investor jumps to a project thread via the compose modal before any message
  // exists yet for it — keeps a synthetic entry in the thread list until the first send lands.
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(LAST_SEEN_KEY);
    setLastSeen(stored ? Number(stored) : 0);
    const now = Date.now();
    window.localStorage.setItem(LAST_SEEN_KEY, String(now));
  }, []);

  const threads = useMemo(() => {
    // `messages` arrives newest-first, so the first message seen per group is that thread's latest.
    const map = new Map<string, Thread>();
    const ownerNames = new Map<string, string>();

    for (const m of messages) {
      if (m.scope === "concierge") {
        const owner = m.threadOwnerUserId ?? m.authorUserId;
        // Capture the owner's display name (their own authored message) for the staff-side title.
        if (m.authorUserId === owner) ownerNames.set(owner, m.authorName);
        const key = `concierge:${owner}`;
        const existing = map.get(key);
        // A staff-role viewer looking at *their own* thread (ministry_admin's escalation channel
        // to ZIDA, or government's "Message ZIDA" channel) is not triaging someone else's enquiry
        // — title it like the investor-facing view, not with their own name.
        const isOwnThread = owner === userId;
        if (existing) {
          existing.count += 1;
        } else {
          map.set(key, {
            key,
            kind: "concierge",
            category: "general",
            title: isOwnThread
              ? "My General Channel with ZIDA"
              : isStaff
                ? ownerNames.get(owner) ?? "General enquiry"
                : "General Concierge",
            subtitle: isOwnThread ? "ZIDA general channel" : isStaff ? "General channel" : "ZIDA general channel",
            ownerUserId: isStaff ? owner : null,
            latest: m,
            count: 1,
          });
        }
      } else {
        const key = `${m.projectId}:${m.engagementId ?? "general"}`;
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(key, {
            key,
            kind: "project",
            category: m.engagementId ? "engagements" : "deals",
            title: m.projectTitle,
            subtitle: m.engagementId ? "Engagement thread" : "General question",
            projectId: m.projectId,
            engagementId: m.engagementId ?? undefined,
            latest: m,
            count: 1,
          });
        }
      }
    }

    // Backfill staff concierge titles now that we've seen all owner-authored messages.
    for (const t of map.values()) {
      if (t.kind === "concierge" && isStaff && t.ownerUserId && t.ownerUserId !== userId) {
        t.title = ownerNames.get(t.ownerUserId) ?? t.title;
      }
    }

    const list = Array.from(map.values());

    // Investors can always start a General Concierge thread (cold start) — inject a synthetic entry
    // if they have none yet.
    if (!isStaff && !list.some((t) => t.kind === "concierge")) {
      list.unshift({
        key: "concierge:self",
        kind: "concierge",
        category: "general",
        title: "General Concierge",
        subtitle: "Message the ZIDA team",
        ownerUserId: null,
        count: 0,
      });
    }

    // Same cold-start treatment for a project/deal thread the investor just jumped to via the
    // compose modal's "Project / Deal Thread" picker, before any message has been sent yet.
    if (!isStaff && pendingProjectId && !list.some((t) => t.projectId === pendingProjectId && !t.engagementId)) {
      const project = getProject(pendingProjectId);
      list.push({
        key: `${pendingProjectId}:general`,
        kind: "project",
        category: "deals",
        title: project?.title ?? "Project thread",
        subtitle: "General question",
        projectId: pendingProjectId,
        count: 0,
      });
    }

    return list;
  }, [messages, isStaff, pendingProjectId, getProject]);

  const handleSelectProjectThread = (projectId: string) => {
    setPendingProjectId(projectId);
    setScope("deals");
    setSelectedKey(`${projectId}:general`);
  };

  const visibleThreads = scope === "all" ? threads : threads.filter((t) => t.category === scope);
  const selected = visibleThreads.find((t) => t.key === selectedKey) ?? visibleThreads[0] ?? null;
  const selectedEngagement = selected?.engagementId ? engagements.find((e) => e.id === selected.engagementId) : null;
  const selectedProject = selected?.projectId ? getProject(selected.projectId) : undefined;

  const countFor = (id: ScopeFilter) => (id === "all" ? threads.length : threads.filter((t) => t.category === id).length);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Communication Hub</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {isStaff
              ? "Every investor question, general enquiry, and internal note across the pipeline, in one inbox."
              : "Questions and updates between you and the ZIDA deal team."}
          </p>
        </div>
        <Button size="sm" onClick={() => setComposeOpen(true)} className="shrink-0">
          <Plus className="h-3.5 w-3.5" /> New Message
        </Button>
      </div>

      <NewMessageModal
        open={composeOpen}
        onOpenChange={setComposeOpen}
        isStaff={isStaff}
        isGovernment={isGovernment}
        onSent={refresh}
        onSelectProjectThread={handleSelectProjectThread}
        ministryProjectOptions={ministryProjectOptions}
      />

      {/* Scope tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SCOPE_TABS.map((tab) => {
          const active = scope === tab.id;
          const count = countFor(tab.id);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setScope(tab.id);
                setSelectedKey(null);
              }}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                active ? "text-white" : "hover:bg-white/5"
              )}
              style={{
                borderColor: active ? "var(--color-zim-accent)" : "rgba(255,255,255,0.1)",
                backgroundColor: active ? "rgba(0,100,0,0.25)" : "transparent",
                color: active ? "#fff" : "var(--color-text-muted)",
              }}
            >
              {tab.label} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <div className="dashboard-panel p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="dashboard-skeleton h-3.5 w-2/3" />
                <div className="dashboard-skeleton h-3 w-1/2" />
              </div>
            ))}
          </div>
          <div className="dashboard-panel p-6 space-y-3">
            <div className="dashboard-skeleton h-5 w-1/3" />
            <div className="dashboard-skeleton h-3.5 w-full" />
          </div>
        </div>
      ) : visibleThreads.length === 0 ? (
        <div className="dashboard-panel p-10 text-center" style={{ color: "var(--color-text-muted)" }}>
          <MessageSquareText className="h-6 w-6 mx-auto mb-2" style={{ color: "var(--color-text-muted)" }} />
          No conversations in this view yet.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <div className="dashboard-panel overflow-hidden">
            <ul className="max-h-[640px] overflow-y-auto">
              {visibleThreads.map((thread) => {
                const isUnread = thread.latest ? new Date(thread.latest.createdAt).getTime() > lastSeen : false;
                const isActive = (selected?.key ?? visibleThreads[0]?.key) === thread.key;
                return (
                  <li key={thread.key}>
                    <button
                      type="button"
                      onClick={() => setSelectedKey(thread.key)}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b transition-colors hover:bg-white/5",
                        isActive && "bg-white/5"
                      )}
                      style={{ borderColor: "rgba(255,255,255,0.05)" }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white truncate">
                          {thread.kind === "concierge" && (
                            <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded align-middle" style={{ backgroundColor: "rgba(0,100,0,0.2)", color: "var(--color-zim-accent-pale)" }}>
                              General
                            </span>
                          )}
                          {thread.title}
                        </p>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--color-zim-accent)" }} />
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                        {thread.subtitle}
                        {thread.count > 0 ? ` · ${thread.count} message${thread.count === 1 ? "" : "s"}` : ""}
                      </p>
                      {thread.latest ? (
                        <>
                          <p className="text-xs truncate mt-1" style={{ color: "var(--color-text-secondary)" }}>
                            {thread.latest.authorName}: {thread.latest.body}
                          </p>
                          <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                            {timeAgo(thread.latest.createdAt)}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs truncate mt-1 inline-flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                          <Plus className="h-3 w-3" /> Start a conversation
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="dashboard-panel p-6">
            {!selected ? (
              <p style={{ color: "var(--color-text-muted)" }}>Select a conversation.</p>
            ) : (
              <div>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-white">{selected.title}</h2>
                  <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    {selected.kind === "concierge"
                      ? isStaff
                        ? "General enquiry — project-less concierge thread"
                        : "Your general channel with the ZIDA deal team"
                      : selectedEngagement
                        ? `Engagement thread with ${selectedEngagement.investorName}`
                        : "General question thread"}
                  </p>
                  <ThreadToolbar
                    threadTitle={selected.title}
                    threadMessages={messages.filter((m) => belongsToThread(m, selected))}
                    canEscalate={
                      isStaff && !isMinistryAdmin && selected.kind === "concierge" && Boolean(selected.ownerUserId)
                    }
                    ownerUserId={selected.ownerUserId ?? null}
                    onEscalated={refresh}
                  />
                </div>

                {/* Sticky project-context header — on a project-bound thread, keep the deal's key
                 *  metrics in view so staff/investors always have the opportunity context while
                 *  messaging (deep-links to the full project page). */}
                {selectedProject && (
                  <div
                    className="sticky top-0 z-10 -mx-6 px-6 py-2.5 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs backdrop-blur"
                    style={{ backgroundColor: "rgba(10,10,10,0.85)", borderBottom: "1px solid var(--color-sovereign-border)" }}
                  >
                    <span className="inline-flex items-center gap-1.5 text-white font-medium">
                      {selectedProject.title.slice(0, 48)}
                    </span>
                    <span className="capitalize" style={{ color: "var(--color-text-muted)" }}>
                      {selectedProject.projectStatus.replace(/_/g, " ")}
                    </span>
                    {/* Parsed headline figure — see formatCapitalHeadline. */}
                    {formatCapitalHeadline(selectedProject.capitalRequired) && (
                      <span style={{ color: "var(--color-text-muted)" }} title={selectedProject.capitalRequired}>
                        · {formatCapitalHeadline(selectedProject.capitalRequired)}
                      </span>
                    )}
                    {selectedProject.province && (
                      <span style={{ color: "var(--color-text-muted)" }}>· {selectedProject.province}</span>
                    )}
                    <a
                      href={`/projects/${selectedProject.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-1 hover:text-white"
                      style={{ color: "var(--color-gold)" }}
                    >
                      View project
                    </a>
                  </div>
                )}
                {selected.kind === "concierge" ? (
                  <MessageThread
                    key={selected.key}
                    concierge={{ ownerUserId: selected.ownerUserId ?? null }}
                    isStaff={isStaff}
                    emptyMessage="No messages yet. Send the ZIDA team a general question below."
                  />
                ) : (
                  <MessageThread
                    key={selected.key}
                    projectId={selected.projectId}
                    engagementId={selected.engagementId ?? null}
                    isStaff={isStaff}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Which inbox messages belong to the selected thread (used for transcript export). */
function belongsToThread(m: ProjectMessageWithProject, t: Thread): boolean {
  if (t.kind === "concierge") {
    if (m.scope !== "concierge") return false;
    return t.ownerUserId ? (m.threadOwnerUserId ?? m.authorUserId) === t.ownerUserId : true;
  }
  if (t.engagementId) return m.engagementId === t.engagementId;
  return m.projectId === t.projectId && !m.engagementId;
}

interface ProjectOption {
  id: string;
  title: string;
}

/** Per-thread toolbar: static SLA/assignment badges, transcript export (CSV + print-to-PDF), and
 *  (staff, on a General Concierge thread) "Link to Opportunity" escalation. */
function ThreadToolbar({
  threadTitle,
  threadMessages,
  canEscalate,
  ownerUserId,
  onEscalated,
}: {
  threadTitle: string;
  threadMessages: ProjectMessageWithProject[];
  canEscalate: boolean;
  ownerUserId: string | null;
  onEscalated: () => void;
}) {
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState("");
  const [linking, setLinking] = useState(false);

  // Assignment: the most recent directed recipient in the thread (chronological last).
  const assignedTo = [...threadMessages].reverse().find((m) => m.recipientName)?.recipientName ?? null;
  const hasMessages = threadMessages.length > 0;

  const openEscalate = async () => {
    setEscalateOpen((v) => !v);
    if (projects.length === 0) {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const all = (await res.json()) as { id: string; title: string }[];
          setProjects(all.map((p) => ({ id: p.id, title: p.title })));
        }
      } catch {
        /* leave empty */
      }
    }
  };

  const escalate = async () => {
    if (!projectId || !ownerUserId) return;
    setLinking(true);
    try {
      const res = await fetch("/api/concierge/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerUserId, projectId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Thread linked to the opportunity");
      setEscalateOpen(false);
      setProjectId("");
      onEscalated();
    } catch {
      toast.error("Could not link the thread");
    } finally {
      setLinking(false);
    }
  };

  const exportCsv = () => {
    const ordered = [...threadMessages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Timestamp", "Author", "Role", "Visibility", "Directed to", "Message"].join(","),
      ...ordered.map((m) =>
        [
          esc(new Date(m.createdAt).toISOString()),
          esc(m.authorName),
          esc(m.authorRole),
          esc(m.visibility),
          esc(m.recipientName ?? ""),
          esc(m.body),
        ].join(",")
      ),
    ].join("\r\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${threadTitle.replace(/[^\w]+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printTranscript = () => {
    const ordered = [...threadMessages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    const escapeHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const body = ordered
      .map(
        (m) =>
          `<div style="margin:0 0 14px;padding-bottom:10px;border-bottom:1px solid #e5e7eb">
            <div style="font-size:12px;color:#6b7280">${new Date(m.createdAt).toLocaleString()} · ${escapeHtml(
              m.authorRole
            )}</div>
            <div style="font-weight:600">${escapeHtml(m.authorName)}${
              m.recipientName ? ` → ${escapeHtml(m.recipientName)}` : ""
            }</div>
            <div style="white-space:pre-wrap;margin-top:4px">${escapeHtml(m.body)}</div>
          </div>`
      )
      .join("");
    win.document.write(
      `<!doctype html><html><head><title>${escapeHtml(threadTitle)} — Transcript</title></head>
       <body style="font-family:system-ui,sans-serif;max-width:720px;margin:32px auto;color:#111">
       <h1 style="font-size:18px">${escapeHtml(threadTitle)}</h1>
       <p style="font-size:12px;color:#6b7280">ZIDA Communication Hub transcript · ${new Date().toLocaleString()}</p>
       ${body || "<p>No messages.</p>"}
       </body></html>`
    );
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span
        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded"
        style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "var(--color-text-muted)" }}
        title="Target first response time"
      >
        <Clock className="h-3 w-3" /> Typical response: within 1 business day
      </span>
      {assignedTo && (
        <span
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded"
          style={{ backgroundColor: "rgba(59,130,246,0.12)", color: "#93c5fd" }}
        >
          <UserCheck className="h-3 w-3" /> Assigned: {assignedTo}
        </span>
      )}
      <div className="flex-1" />
      {hasMessages && (
        <>
          <button
            type="button"
            onClick={exportCsv}
            className="btn-sovereign-ghost text-[11px] px-2.5 py-1 inline-flex items-center gap-1"
            title="Export transcript as CSV"
          >
            <Download className="h-3 w-3" /> CSV
          </button>
          <button
            type="button"
            onClick={printTranscript}
            className="btn-sovereign-ghost text-[11px] px-2.5 py-1 inline-flex items-center gap-1"
            title="Print / save as PDF"
          >
            <Printer className="h-3 w-3" /> PDF
          </button>
        </>
      )}
      {canEscalate && (
        <button
          type="button"
          onClick={openEscalate}
          className="btn-sovereign-ghost text-[11px] px-2.5 py-1 inline-flex items-center gap-1"
          title="Re-scope this general thread onto a project"
        >
          <Link2 className="h-3 w-3" /> Link to Opportunity
        </button>
      )}

      {escalateOpen && canEscalate && (
        <div className="w-full flex items-center gap-2 mt-1">
          <select
            className="dashboard-input h-8 text-xs flex-1"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Select an opportunity…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={escalate}
            disabled={!projectId || linking}
            className="btn-sovereign text-xs px-3 py-1.5 disabled:opacity-50"
          >
            {linking ? "Linking…" : "Link"}
          </button>
        </div>
      )}
    </div>
  );
}
