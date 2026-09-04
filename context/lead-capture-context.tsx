"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { LeadInquiry } from "@/lib/types";

interface LeadCaptureContextValue {
  inquiries: LeadInquiry[];
  isLoading: boolean;
  addInquiry: (inquiry: Omit<LeadInquiry, "id" | "createdAt">) => Promise<void>;
  /** `reason` is required by the server for every decision except resetting back to "pending" —
   *  see the reason-required vetting workflow (Investor Qualification Vetting plan). Throws with
   *  the server's error message on failure (e.g. KYC_INCOMPLETE) so callers can surface it. */
  updateInquiryStatus: (id: string, status: LeadInquiry["status"], reason?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const LeadCaptureContext = createContext<LeadCaptureContextValue | null>(null);

export function LeadCaptureProvider({ children }: { children: React.ReactNode }) {
  const [inquiries, setInquiries] = useState<LeadInquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/inquiries");
      if (res.ok) setInquiries(await res.json());
    } catch {
      /* non-admin visitors get empty list */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addInquiry = useCallback(async (inquiry: Omit<LeadInquiry, "id" | "createdAt">) => {
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...inquiry, status: inquiry.status ?? "pending" }),
    });
    if (!res.ok) throw new Error("Failed to submit inquiry");
    const created = (await res.json()) as LeadInquiry;
    setInquiries((prev) => [created, ...prev]);
  }, []);

  const updateInquiryStatus = useCallback(async (id: string, status: LeadInquiry["status"], reason?: string) => {
    const res = await fetch(`/api/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to update inquiry");
    }
    const updated = (await res.json()) as LeadInquiry;
    // Spread onto the existing row (not a full replace) so the GET-only `matchedUserId` enrichment
    // — never returned by this PATCH response — survives the optimistic local update.
    setInquiries((prev) => prev.map((inq) => (inq.id === id ? { ...inq, ...updated } : inq)));
  }, []);

  return (
    <LeadCaptureContext.Provider
      value={{ inquiries, isLoading, addInquiry, updateInquiryStatus, refresh }}
    >
      {children}
    </LeadCaptureContext.Provider>
  );
}

export function useLeadCapture() {
  const ctx = useContext(LeadCaptureContext);
  if (!ctx) throw new Error("useLeadCapture must be used within LeadCaptureProvider");
  return ctx;
}
