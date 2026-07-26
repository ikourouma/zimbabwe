"use client";

import { useCallback, useEffect, useState } from "react";
import type { EngagementMou, InvestorEngagementStatus, MouAction, MouContent, MouFormatting, MouSignatureMetadata } from "@/lib/types";

interface UseEngagementMouResult {
  mou: EngagementMou | null;
  engagementStatus: InvestorEngagementStatus | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  updateDraft: (patch: { content?: Partial<MouContent>; formatting?: Partial<MouFormatting> }) => Promise<boolean>;
  runAction: (action: MouAction, extra?: { notes?: string; signatureMetadata?: MouSignatureMetadata }) => Promise<boolean>;
  error: string | null;
}

/** Powers the MOU tab of both the Engagement Detail drawer and the Project Detail drawer — one
 *  client hook against GET/PATCH /api/engagements/[id]/mou and POST .../mou/actions. */
export function useEngagementMou(engagementId: string | null): UseEngagementMouResult {
  const [mou, setMou] = useState<EngagementMou | null>(null);
  const [engagementStatus, setEngagementStatus] = useState<InvestorEngagementStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!engagementId) {
      setMou(null);
      setEngagementStatus(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/mou`);
      if (!res.ok) throw new Error("Failed to load MOU");
      const data = (await res.json()) as { mou: EngagementMou | null; engagementStatus: InvestorEngagementStatus };
      setMou(data.mou);
      setEngagementStatus(data.engagementStatus);
    } catch {
      setError("Failed to load MOU");
    } finally {
      setIsLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateDraft = useCallback(
    async (patch: { content?: Partial<MouContent>; formatting?: Partial<MouFormatting> }) => {
      if (!engagementId) return false;
      setError(null);
      try {
        const res = await fetch(`/api/engagements/${engagementId}/mou`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to update MOU draft");
        }
        setMou(await res.json());
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update MOU draft");
        return false;
      }
    },
    [engagementId]
  );

  const runAction = useCallback(
    async (action: MouAction, extra?: { notes?: string; signatureMetadata?: MouSignatureMetadata }) => {
      if (!engagementId) return false;
      setError(null);
      try {
        const res = await fetch(`/api/engagements/${engagementId}/mou/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...extra }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to update MOU");
        }
        setMou(await res.json());
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update MOU");
        return false;
      }
    },
    [engagementId]
  );

  return { mou, engagementStatus, isLoading, refresh, updateDraft, runAction, error };
}
