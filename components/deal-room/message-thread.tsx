"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { CalendarClock, CheckCircle2, CornerDownRight, FileEdit, FileText, Handshake, Lock, MessageCircle, Paperclip, PhoneCall, Reply, ShieldAlert, Trash2, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/components/dashboard/activity-feed";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/auth-context";
import { useThreadMessages, type PendingAttachment, type ThreadChannel } from "@/lib/hooks/use-project-messages";
import { NO_SUBJECT, OTHER_SUBJECT, SUBJECT_OPTIONS, resolveSubject } from "@/lib/governance/message-subjects";
import type { MessageAttachment, MessageVisibility, ProjectMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const VISIBILITY_LABEL: Record<MessageVisibility, string> = {
  internal: "Internal note",
  investor_visible: "Visible to investor",
  mou: "MOU thread",
};

const NO_RECIPIENT = "__none__";

interface DealTeamMember {
  userId: string;
  name: string;
  role: string;
}

interface EngagedInvestor {
  userId: string;
  name: string;
  role: string;
  organization?: string | null;
}

interface MessageThreadProps {
  projectId?: string;
  /** Narrows to one engagement's thread (e.g. an MOU comment thread) — omit for the project's
   *  general "ask ZIDA a question" thread. */
  engagementId?: string | null;
  /** When set, use the project-less General Concierge channel instead of a project thread.
   *  `ownerUserId` is the investor whose thread this is (staff replying) or the investor's own. */
  concierge?: { ownerUserId: string | null };
  /** Staff (admin/super_admin/government) can post "internal" notes and pick visibility;
   *  investors always post "investor_visible" and may route to a named case manager. */
  isStaff: boolean;
  /** Read-only oversight viewer (ministry_admin — Subject Dropdown + Ministry Engagements plan,
   *  Part B): sees the full thread the server returns for them but the composer and "Reply" are
   *  hidden entirely — no posting, no Action Card decisions — regardless of `isStaff`. */
  readOnly?: boolean;
  emptyMessage?: string;
  className?: string;
  /** Called after an interactive Action Card is resolved (approve/decline) so parents can refresh. */
  onActionResolved?: () => void;
}

/** Shared Communication Hub thread — message list + composer. Reused by the Project Detail Drawer,
 *  the full Communication Hub page, and the General Concierge channel. Supports threaded replies,
 *  case-manager routing, R2 attachments, and interactive Action Cards (correction approve/counter). */
export function MessageThread({
  projectId,
  engagementId,
  concierge,
  isStaff,
  readOnly = false,
  emptyMessage,
  className,
  onActionResolved,
}: MessageThreadProps) {
  const { userId, role, ministryId } = useAuth();
  const channel: ThreadChannel = concierge
    ? { kind: "concierge", ownerUserId: concierge.ownerUserId }
    : { kind: "project", projectId: projectId ?? null, engagementId };
  const { messages, isLoading, refresh, postMessage, uploadAttachment } = useThreadMessages(channel);

  const [draft, setDraft] = useState("");
  const [subjectOption, setSubjectOption] = useState<string>(NO_SUBJECT);
  const [subjectOther, setSubjectOther] = useState("");
  const [visibility, setVisibility] = useState<MessageVisibility>("investor_visible");
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ProjectMessage | null>(null);
  const [recipientId, setRecipientId] = useState<string>(NO_RECIPIENT);
  const [dealTeam, setDealTeam] = useState<DealTeamMember[]>([]);
  // Ministry Message Recipient Targeting plan — a ministry_admin composes with isStaff=true (they
  // get "internal" visibility on their own ministry's projects) so the investor-only recipient
  // picker above never applies to them; this is their parallel "To" directory instead, split into
  // the ministry-wide part (fetched once) and the per-project investor part (refetched on
  // `projectId` change, since that's the only thing scoping who's a valid target).
  const [ministryDirectory, setMinistryDirectory] = useState<{ government: DealTeamMember[]; staff: DealTeamMember[] }>({
    government: [],
    staff: [],
  });
  const [ministryInvestors, setMinistryInvestors] = useState<EngagedInvestor[]>([]);
  const isMinistryAdmin = role === "ministry_admin";
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Concierge threads never carry MOU visibility.
  const visibilityOptions: MessageVisibility[] = concierge
    ? ["investor_visible", "internal"]
    : ["internal", "investor_visible", "mou"];

  // Investors can route a message to a named case manager — load the directory once. Skipped
  // entirely for a read-only viewer, who never sees the composer this directory powers.
  useEffect(() => {
    if (isStaff || readOnly) return;
    let cancelled = false;
    fetch("/api/deal-team")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: DealTeamMember[]) => !cancelled && setDealTeam(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isStaff]);

  // Ministry Message Recipient Targeting plan — the ministry-wide half of a ministry_admin's "To"
  // directory (government officials in my ministry + ZIDA admin/super_admin). Doesn't depend on
  // projectId, so it's loaded once per mount.
  useEffect(() => {
    if (!isMinistryAdmin || readOnly) return;
    let cancelled = false;
    fetch("/api/ministry/recipients")
      .then((r) => (r.ok ? r.json() : { government: [], staff: [] }))
      .then((data) => !cancelled && setMinistryDirectory(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isMinistryAdmin, readOnly]);

  // The other half — investors engaged on this specific project — is refetched whenever the
  // project changes, and any stale selection from a different project's list is cleared.
  useEffect(() => {
    setRecipientId(NO_RECIPIENT);
    if (!isMinistryAdmin || readOnly || !projectId) {
      setMinistryInvestors([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/projects/${projectId}/engaged-investors`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: EngagedInvestor[]) => !cancelled && setMinistryInvestors(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isMinistryAdmin, readOnly, projectId]);

  const authorNameById = (id?: string | null) =>
    (id && messages.find((m) => m.id === id)?.authorName) || "a message";

  const handlePickFiles = () => fileInputRef.current?.click();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadAttachment(file);
        setPending((prev) => [...prev, uploaded]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (!draft.trim() && pending.length === 0) return;
    setIsSending(true);
    try {
      await postMessage(draft.trim(), {
        subject: resolveSubject(subjectOption, subjectOther),
        visibility: isStaff ? visibility : undefined,
        parentMessageId: replyTo?.id,
        recipientUserId: (!isStaff || isMinistryAdmin) && recipientId !== NO_RECIPIENT ? recipientId : undefined,
        attachments: pending.length > 0 ? pending : undefined,
      });
      setDraft("");
      setSubjectOption(NO_SUBJECT);
      setSubjectOther("");
      setReplyTo(null);
      setRecipientId(NO_RECIPIENT);
      setPending([]);
    } catch {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleAction = async (messageId: string, decision: "approve" | "decline" | "request_briefing") => {
    setResolving(messageId);
    try {
      const res = await fetch(`/api/messages/${messageId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not update the request");
      }
      await refresh();
      onActionResolved?.();
      toast.success(
        decision === "approve" ? "Approved" : decision === "decline" ? "Declined" : "Briefing requested"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setResolving(null);
    }
  };

  // Group into top-level messages + their replies so a thread renders hierarchically.
  const topLevel = messages.filter((m) => !m.parentMessageId);
  const repliesByParent = new Map<string, ProjectMessage[]>();
  for (const m of messages) {
    if (m.parentMessageId) {
      const list = repliesByParent.get(m.parentMessageId) ?? [];
      list.push(m);
      repliesByParent.set(m.parentMessageId, list);
    }
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="dashboard-skeleton h-14 w-full rounded-md" />)
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="h-6 w-6 mb-2" style={{ color: "var(--color-text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {emptyMessage ?? "No messages yet. Start the conversation below."}
            </p>
          </div>
        ) : (
          topLevel.map((m) => (
            <div key={m.id} className="space-y-2">
              <MessageCard
                message={m}
                currentUserId={userId}
                actorRole={role}
                viewerMinistryId={ministryId}
                isStaff={isStaff}
                readOnly={readOnly}
                resolving={resolving === m.id}
                onReply={() => setReplyTo(m)}
                onAction={handleAction}
              />
              {(repliesByParent.get(m.id) ?? []).map((reply) => (
                <div
                  key={reply.id}
                  className="ml-5 pl-3 border-l"
                  style={{ borderColor: "var(--color-sovereign-border)" }}
                >
                  <MessageCard
                    message={reply}
                    currentUserId={userId}
                    actorRole={role}
                    viewerMinistryId={ministryId}
                    isStaff={isStaff}
                    readOnly={readOnly}
                    resolving={resolving === reply.id}
                    onReply={() => setReplyTo(m)}
                    onAction={handleAction}
                    replyingToName={authorNameById(reply.parentMessageId)}
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {!readOnly && (
      <div className="mt-4 space-y-2 border-t pt-3" style={{ borderColor: "var(--color-sovereign-border)" }}>
        {replyTo && (
          <div
            className="flex items-center justify-between rounded px-2.5 py-1.5 text-xs"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "var(--color-text-secondary)" }}
          >
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <Reply className="h-3 w-3 shrink-0" />
              <span className="truncate">
                Replying to <strong>{replyTo.authorName}</strong>
              </span>
            </span>
            <button type="button" onClick={() => setReplyTo(null)} className="shrink-0 hover:text-white" aria-label="Cancel reply">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Full Persona Communication Parity plan — a ministry_admin's concierge carve-out
         *  (their own escalation thread, or replying into an official's thread) never supports
         *  "internal" visibility server-side (app/api/concierge/messages/route.ts's STAFF_ROLES
         *  excludes ministry_admin on purpose); hide the toggle here so the UI never offers a
         *  choice that would silently downgrade to investor_visible. Still shown for ministry_admin
         *  on project threads, where they do have internal-note authority on their own ministry. */}
        {isStaff && !(concierge && isMinistryAdmin) && (
          <Select value={visibility} onValueChange={(v) => setVisibility(v as MessageVisibility)}>
            <SelectTrigger className="h-8 text-xs w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {visibilityOptions.map((v) => (
                <SelectItem key={v} value={v}>{VISIBILITY_LABEL[v]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isMinistryAdmin && (ministryInvestors.length > 0 || ministryDirectory.government.length > 0 || ministryDirectory.staff.length > 0) && (
          <Select value={recipientId} onValueChange={setRecipientId}>
            <SelectTrigger className="h-8 text-xs w-64">
              <SelectValue placeholder="To: General (visible to everyone)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_RECIPIENT}>To: General (visible to everyone)</SelectItem>
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
        )}

        {!isStaff && dealTeam.length > 0 && (
          <Select value={recipientId} onValueChange={setRecipientId}>
            <SelectTrigger className="h-8 text-xs w-64">
              <SelectValue placeholder="To: ZIDA deal team (general)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_RECIPIENT}>To: ZIDA deal team (general)</SelectItem>
              {dealTeam.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  To: {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {pending.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pending.map((att, i) => (
              <span
                key={`${att.storageKey}-${i}`}
                className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--color-text-secondary)" }}
              >
                <FileText className="h-3 w-3" style={{ color: "var(--color-gold)" }} />
                <span className="max-w-[160px] truncate">{att.fileName}</span>
                <button
                  type="button"
                  onClick={() => setPending((prev) => prev.filter((_, idx) => idx !== i))}
                  className="hover:text-white"
                  aria-label={`Remove ${att.fileName}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Subject is a lightweight organizational aid, not a threading key — only offered on a new
         *  top-level message; a reply already inherits its parent's context. */}
        {!replyTo && (
          <div className="space-y-1.5">
            <Select value={subjectOption} onValueChange={setSubjectOption}>
              <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Subject (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SUBJECT}>No subject</SelectItem>
                {SUBJECT_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subjectOption === OTHER_SUBJECT && (
              <input
                className="dashboard-input h-8 text-xs"
                placeholder="Describe the subject…"
                value={subjectOther}
                onChange={(e) => setSubjectOther(e.target.value)}
                maxLength={140}
              />
            )}
          </div>
        )}

        <textarea
          className="dashboard-input min-h-[70px]"
          placeholder="Write a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || uploading || (!draft.trim() && pending.length === 0)}
            className="btn-sovereign text-xs px-4 py-2"
          >
            {isSending ? "Sending…" : "Send"}
          </button>
          <button
            type="button"
            onClick={handlePickFiles}
            disabled={uploading}
            className="btn-sovereign-ghost text-xs px-3 py-2"
            title="Attach a file"
          >
            <Paperclip className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Attach"}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

function MessageCard({
  message: m,
  currentUserId,
  actorRole,
  viewerMinistryId,
  isStaff,
  readOnly = false,
  resolving,
  onReply,
  onAction,
  replyingToName,
}: {
  message: ProjectMessage;
  currentUserId: string | null;
  actorRole: string | null;
  viewerMinistryId?: string | null;
  isStaff: boolean;
  readOnly?: boolean;
  resolving: boolean;
  onReply: () => void;
  onAction: (messageId: string, decision: "approve" | "decline" | "request_briefing") => void;
  replyingToName?: string;
}) {
  const directedToMe = Boolean(m.recipientUserId && m.recipientUserId === currentUserId);
  const isActionCard = m.kind === "action" && m.payload;
  return (
    <div
      className="rounded-md p-3"
      style={{
        backgroundColor: isActionCard ? "rgba(255,211,0,0.05)" : "rgba(255,255,255,0.03)",
        ...(isActionCard
          ? { boxShadow: "inset 0 0 0 1px rgba(255,211,0,0.25)" }
          : directedToMe
            ? { boxShadow: "inset 0 0 0 1px rgba(255,211,0,0.4)" }
            : {}),
      }}
    >
      {replyingToName && (
        <p className="flex items-center gap-1 text-[11px] mb-1" style={{ color: "var(--color-text-muted)" }}>
          <CornerDownRight className="h-3 w-3" /> Replying to {replyingToName}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-white">
          {m.authorName}
          <span className="ml-1.5 text-xs font-normal capitalize" style={{ color: "var(--color-text-muted)" }}>
            · {m.authorRole.replace(/_/g, " ")}
          </span>
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          {m.recipientName && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#93c5fd" }}
              title={`Directed to ${m.recipientName}`}
            >
              <UserCheck className="h-2.5 w-2.5" /> To: {m.recipientName}
            </span>
          )}
          {m.visibility === "internal" && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "rgba(255,211,0,0.12)", color: "#fde047" }}
              title="Only ZIDA/Admin/Government can see this note"
            >
              <Lock className="h-2.5 w-2.5" /> Internal
            </span>
          )}
          {m.visibility === "mou" && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "rgba(0,100,0,0.15)", color: "var(--color-zim-accent-pale)" }}
            >
              MOU
            </span>
          )}
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }} title={new Date(m.createdAt).toLocaleString()}>
            {timeAgo(m.createdAt)}
          </p>
        </div>
      </div>
      {m.subject && (
        <p className="text-sm font-semibold text-white mt-1.5">{m.subject}</p>
      )}
      {m.body && (
        <p className={cn("text-sm whitespace-pre-wrap", m.subject ? "mt-0.5" : "mt-1.5")} style={{ color: "var(--color-text-secondary)" }}>
          {m.body}
        </p>
      )}
      {isActionCard && (
        <ActionCardBody
          message={m}
          actorRole={actorRole}
          viewerMinistryId={viewerMinistryId}
          isStaff={isStaff && !readOnly}
          resolving={resolving}
          onAction={onAction}
          onCounter={onReply}
        />
      )}
      {m.attachments && m.attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {m.attachments.map((att) => (
            <AttachmentChip key={att.id} attachment={att} />
          ))}
        </div>
      )}
      {!readOnly && (
        <button
          type="button"
          onClick={onReply}
          className="mt-2 inline-flex items-center gap-1 text-[11px] hover:text-white"
          style={{ color: "var(--color-text-muted)" }}
        >
          <Reply className="h-3 w-3" /> Reply
        </button>
      )}
    </div>
  );
}

/** The interactive body of a correction Action Card — proposal detail, status, and staff controls. */
function ActionCardBody({
  message: m,
  actorRole,
  viewerMinistryId,
  isStaff,
  resolving,
  onAction,
  onCounter,
}: {
  message: ProjectMessage;
  actorRole: string | null;
  viewerMinistryId?: string | null;
  isStaff: boolean;
  resolving: boolean;
  onAction: (messageId: string, decision: "approve" | "decline" | "request_briefing") => void;
  onCounter: () => void;
}) {
  const p = m.payload;
  if (!p) return null;
  const isCall = p.type === "schedule_call";
  const isDelete = p.type === "delete_request";
  const isAmendment = p.type === "project_amendment_request";
  const isAssociation = p.type === "ministry_association_request";
  // A delete_request stays actionable through "briefing_requested" (still pending a decision);
  // "escalated" (Phase 8) — a government-filed amendment request its own ministry_admin already
  // approved — is likewise still pending (ZIDA's final call); every other card/status combination
  // is only actionable while "open".
  const isActionable = p.status === "open" || p.status === "escalated" || (isDelete && p.status === "briefing_requested");
  // Government is copied on delete_request/project_amendment_request/ministry_association_request
  // cards for transparency but has no Approve/Decline authority on any of the three (see POST
  // /api/messages/[id]/action) — every other card type keeps the existing isStaff-wide authority.
  const isGovernmentOnDelete = isDelete && actorRole === "government";
  const isGovernmentOnAmendment = isAmendment && actorRole === "government";
  const isGovernmentOnAssociation = isAssociation && actorRole === "government";
  // ministry_admin has exactly one decision authority platform-wide (Phase 8): an "open",
  // government-filed amendment request from their own ministry — never ministry_association_request
  // (admin/super_admin-only, same as the project's Publish gate), and never a government-filed
  // amendment request that's already "escalated" (that's ZIDA's call now). Everything else stays
  // blocked for them even though `isStaff` is often true for a ministry_admin (see
  // ProjectDetailDrawer/CommunicationHubView's isStaff wiring).
  const isMinistryAdminOnAssociation = isAssociation && actorRole === "ministry_admin";
  const isGovFiledAmendment = isAmendment && m.authorRole === "government";
  const isMinistryAdminAmendmentStage1 =
    isGovFiledAmendment &&
    actorRole === "ministry_admin" &&
    p.status === "open" &&
    Boolean(viewerMinistryId) &&
    p.requestingMinistryId === viewerMinistryId;
  const isMinistryAdminBlockedOnAmendment = isAmendment && actorRole === "ministry_admin" && !isMinistryAdminAmendmentStage1;
  // A plain admin must wait for the ministry-level decision on an "open" government-filed request
  // — mirrors the server-side gate in POST /api/messages/[id]/action. Super Admin keeps full
  // override authority at every stage (isStaff is never narrowed for them here).
  const isAdminAwaitingMinistryStage = isGovFiledAmendment && p.status === "open" && actorRole === "admin";
  const canDecide =
    isStaff &&
    !isGovernmentOnDelete &&
    !isGovernmentOnAmendment &&
    !isGovernmentOnAssociation &&
    !isMinistryAdminOnAssociation &&
    !isMinistryAdminBlockedOnAmendment &&
    !isAdminAwaitingMinistryStage;
  const canRequestBriefing = isStaff; // admin, super_admin, and government alike (delete_request only)

  const statusStyle: Record<string, { bg: string; fg: string; label: string }> = {
    open: {
      bg: "rgba(255,211,0,0.15)",
      fg: "#fde047",
      label: isGovFiledAmendment ? "Awaiting Ministry Admin" : "Awaiting review",
    },
    escalated: { bg: "rgba(168,85,247,0.15)", fg: "#d8b4fe", label: "Escalated — awaiting ZIDA" },
    briefing_requested: { bg: "rgba(59,130,246,0.15)", fg: "#93c5fd", label: "Briefing requested" },
    resolved: { bg: "rgba(34,197,94,0.15)", fg: "#4ade80", label: isCall ? "Accepted" : isDelete ? "Deleted" : "Approved" },
    declined: { bg: "rgba(248,113,113,0.15)", fg: "#f87171", label: "Declined" },
  };
  const s = statusStyle[p.status] ?? statusStyle.open;
  const proposedWhen = p.proposedTime
    ? (Number.isNaN(new Date(p.proposedTime).getTime()) ? p.proposedTime : new Date(p.proposedTime).toLocaleString())
    : null;

  return (
    <div className="mt-2 rounded-md p-2.5" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: isDelete ? "#f87171" : "var(--color-gold)" }}>
          {isCall ? (
            <CalendarClock className="h-3 w-3" />
          ) : isDelete ? (
            <Trash2 className="h-3 w-3" />
          ) : isAmendment ? (
            <FileEdit className="h-3 w-3" />
          ) : isAssociation ? (
            <Handshake className="h-3 w-3" />
          ) : (
            <ShieldAlert className="h-3 w-3" />
          )}
          {isCall
            ? "Call proposal"
            : isDelete
              ? "Deletion request (approved engagement)"
              : isAmendment
                ? "Project amendment request"
                : isAssociation
                  ? "Ministry association request"
                  : "Correction request"}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ backgroundColor: s.bg, color: s.fg }}>
          {s.label}
        </span>
      </div>

      {(isGovernmentOnDelete || isGovernmentOnAssociation || isMinistryAdminOnAssociation) && (
        <p className="text-[11px] mb-1.5 italic" style={{ color: "var(--color-text-muted)" }}>
          You&apos;re copied on this for transparency — ZIDA Admin / Platform Admin decide the outcome
          {isGovernmentOnDelete ? ", though you may request a briefing before they do." : "."}
        </p>
      )}
      {isGovernmentOnAmendment && (
        <p className="text-[11px] mb-1.5 italic" style={{ color: "var(--color-text-muted)" }}>
          {p.status === "escalated"
            ? "Your ministry's Ministry Admin approved this — ZIDA Admin makes the final call."
            : "Awaiting a decision from your ministry's Ministry Admin, then ZIDA Admin for final action."}
        </p>
      )}
      {isMinistryAdminBlockedOnAmendment && (
        <p className="text-[11px] mb-1.5 italic" style={{ color: "var(--color-text-muted)" }}>
          You&apos;re copied on this for transparency — ZIDA Admin decides the final outcome.
        </p>
      )}
      {isAdminAwaitingMinistryStage && (
        <p className="text-[11px] mb-1.5 italic" style={{ color: "var(--color-text-muted)" }}>
          Awaiting a decision from {p.requestingMinistryName ?? "the requester's ministry"}&apos;s Ministry Admin. A Super
          Admin can override if needed.
        </p>
      )}

      {(isAssociation || isGovFiledAmendment) && (
        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs mb-1.5">
          <span style={{ color: "var(--color-text-muted)" }}>Requesting ministry</span>
          <span className="text-white">{p.requestingMinistryName ?? "—"}</span>
        </div>
      )}
      {p.firstStageApprovedByName && (
        <p className="text-[11px] mb-1.5" style={{ color: "var(--color-text-muted)" }}>
          Ministry-approved by {p.firstStageApprovedByName}
          {p.firstStageApprovedAt ? ` · ${timeAgo(p.firstStageApprovedAt)}` : ""}
        </p>
      )}

      {isCall && (
        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs mb-1.5">
          <span style={{ color: "var(--color-text-muted)" }}>When</span>
          <span className="text-white">{proposedWhen ?? "—"}</span>
          {p.callMode && (
            <>
              <span style={{ color: "var(--color-text-muted)" }}>Mode</span>
              <span className="text-white">{p.callMode}</span>
            </>
          )}
        </div>
      )}

      {p.field && (
        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs mb-1.5">
          <span style={{ color: "var(--color-text-muted)" }}>Field</span>
          <span className="text-white">{p.fieldLabel ?? p.field}</span>
          <span style={{ color: "var(--color-text-muted)" }}>Current</span>
          <span className="text-white line-through opacity-70">{p.currentValue || "—"}</span>
          <span style={{ color: "var(--color-text-muted)" }}>Proposed</span>
          <span style={{ color: "#4ade80" }}>{p.proposedValue || "—"}</span>
        </div>
      )}

      {isAmendment && p.proposedChanges && (
        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs mb-1.5">
          {Object.entries(p.proposedChanges).map(([field, value]) => (
            <Fragment key={field}>
              <span style={{ color: "var(--color-text-muted)" }}>{field}</span>
              <span style={{ color: "#4ade80" }}>{String(value)}</span>
            </Fragment>
          ))}
        </div>
      )}

      {(p.status === "resolved" || p.status === "declined") && p.resolvedByName && (
        <p className="text-[11px] mb-1" style={{ color: "var(--color-text-muted)" }}>
          {p.status === "resolved" ? (isCall ? "Accepted" : isDelete ? "Deletion approved" : "Approved") : "Declined"} by{" "}
          {p.resolvedByName}
          {p.resolvedAt ? ` · ${timeAgo(p.resolvedAt)}` : ""}
        </p>
      )}

      {isActionable && (canDecide || (isGovernmentOnDelete && canRequestBriefing)) && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {canDecide && (
            <button
              type="button"
              onClick={() => onAction(m.id, "approve")}
              disabled={resolving}
              className="btn-sovereign text-xs px-3 py-1.5 inline-flex items-center gap-1 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />{" "}
              {resolving
                ? "Working…"
                : isCall
                  ? "Accept"
                  : isDelete
                    ? "Approve Deletion"
                    : isMinistryAdminAmendmentStage1
                      ? "Approve & Escalate to ZIDA"
                      : "Approve"}
            </button>
          )}
          {canDecide && !isCall && !isDelete && !isAmendment && !isAssociation && (
            <button
              type="button"
              onClick={onCounter}
              disabled={resolving}
              className="btn-sovereign-ghost text-xs px-3 py-1.5"
            >
              Propose counter
            </button>
          )}
          {isDelete && p.status !== "briefing_requested" && canRequestBriefing && (
            <button
              type="button"
              onClick={() => onAction(m.id, "request_briefing")}
              disabled={resolving}
              className="btn-sovereign-ghost text-xs px-3 py-1.5 inline-flex items-center gap-1"
            >
              <PhoneCall className="h-3.5 w-3.5" /> Request a Briefing
            </button>
          )}
          {canDecide && (
            <button
              type="button"
              onClick={() => onAction(m.id, "decline")}
              disabled={resolving}
              className="text-xs px-2 py-1.5 hover:text-white disabled:opacity-50"
              style={{ color: "var(--color-text-muted)" }}
            >
              Decline
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AttachmentChip({ attachment }: { attachment: MessageAttachment }) {
  return (
    <a
      href={`/api/attachments/${attachment.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs hover:bg-white/10 transition-colors"
      style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--color-text-secondary)" }}
      title={`Download ${attachment.fileName}`}
    >
      <FileText className="h-3 w-3" style={{ color: "var(--color-gold)" }} />
      <span className="max-w-[180px] truncate">{attachment.fileName}</span>
    </a>
  );
}
