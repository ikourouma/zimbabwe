"use client";

import { useState } from "react";
import { Handshake, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { useDealRoomStore } from "@/context/deal-room-store-context";
import { EngagementStatusPill } from "@/components/deal-room/engagement-status-pill";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { InvestmentProject } from "@/lib/types";

interface ProjectEngageCtaProps {
  project: InvestmentProject;
}

/**
 * Real-auth (useAuth(), not the demo-persona simulator) "Engage" / "Contact ZIDA Deal Team"
 * block for published projects — per the Deal Room Engagement and MOU Upgrade plan (#5): every
 * published project should give a signed-in qualified investor a direct path into an engagement
 * and a line to the ZIDA deal team, since every engagement's end goal is an MOU and, ultimately,
 * fund-raising for execution. Rendered alongside (not replacing) the existing demo-toggle-gated
 * `WorkspaceAccessCta` block — this is additive, closing the "still uses useDemoPersona()" gap
 * only for this one new surface.
 */
export function ProjectEngageCta({ project }: ProjectEngageCtaProps) {
  const { isQualified, isAuthenticated, name } = useAuth();
  const { getEngagementsForProject, addEngagement } = useDealRoomStore();
  const [isRequesting, setIsRequesting] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (!isAuthenticated || !isQualified || project.projectStatus !== "published") return null;

  const myEngagement = getEngagementsForProject(project.id)[0] ?? null;

  const handleRequestEngagement = async () => {
    setIsRequesting(true);
    try {
      await addEngagement({
        id: "",
        projectId: project.id,
        investorName: name ?? "Qualified Investor",
        status: "submitted",
        createdAt: "",
        updatedAt: "",
      });
      toast.success("Engagement request sent to the ZIDA deal team.");
    } catch {
      toast.error("Failed to send engagement request.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSendQuestion = async () => {
    if (!question.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: question.trim(), engagementId: myEngagement?.id }),
      });
      if (!res.ok) throw new Error("Failed to send");
      toast.success("Your question has been sent to the ZIDA deal team.");
      setQuestion("");
      setAskOpen(false);
    } catch {
      toast.error("Failed to send your question.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="rounded-lg border p-5 space-y-3"
      style={{ borderColor: "var(--color-sovereign-border)", backgroundColor: "rgba(0,100,0,0.06)" }}
    >
      <div className="flex items-start gap-3">
        <Handshake className="h-5 w-5 shrink-0" style={{ color: "var(--color-zim-accent)" }} />
        <div>
          <p className="text-sm font-medium text-white">Engage with this opportunity</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Request an engagement with the ZIDA deal team or ask a question. Every engagement is a
            step toward an MOU — and, ultimately, fund-raising for execution.
          </p>
        </div>
      </div>

      {myEngagement ? (
        <div
          className="flex items-center justify-between rounded-md px-3 py-2"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Your engagement
          </span>
          <EngagementStatusPill status={myEngagement.status} />
        </div>
      ) : (
        <button
          type="button"
          onClick={handleRequestEngagement}
          disabled={isRequesting}
          className="btn-sovereign text-xs px-4 py-2 w-full justify-center"
        >
          {isRequesting ? "Sending…" : "Request Engagement"}
        </button>
      )}

      <button
        type="button"
        onClick={() => setAskOpen(true)}
        className="btn-sovereign-ghost text-xs px-4 py-2 w-full justify-center"
      >
        <MessageSquareText className="h-3.5 w-3.5" /> Contact ZIDA Deal Team
      </button>

      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask the ZIDA Deal Team</DialogTitle>
          </DialogHeader>
          <textarea
            className="dashboard-input min-h-[120px]"
            placeholder={`Ask a question about "${project.title.slice(0, 60)}"…`}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={handleSendQuestion} disabled={isSending || !question.trim()}>
              {isSending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
