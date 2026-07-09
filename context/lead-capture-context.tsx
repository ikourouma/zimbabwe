"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { LeadInquiry } from "@/lib/types";

interface LeadCaptureContextValue {
  inquiries: LeadInquiry[];
  addInquiry: (inquiry: Omit<LeadInquiry, "id" | "createdAt">) => void;
  updateInquiryStatus: (id: string, status: LeadInquiry["status"]) => void;
}

const LeadCaptureContext = createContext<LeadCaptureContextValue | null>(null);

const STORAGE_KEY = "zim-lead-inquiries";

export function LeadCaptureProvider({ children }: { children: React.ReactNode }) {
  const [inquiries, setInquiries] = useState<LeadInquiry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setInquiries(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  const addInquiry = useCallback((inquiry: Omit<LeadInquiry, "id" | "createdAt">) => {
    const newInquiry: LeadInquiry = {
      ...inquiry,
      id: `lead-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setInquiries((prev) => {
      const next = [newInquiry, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateInquiryStatus = useCallback((id: string, status: LeadInquiry["status"]) => {
    setInquiries((prev) => {
      const next = prev.map((inq) => (inq.id === id ? { ...inq, status } : inq));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <LeadCaptureContext.Provider value={{ inquiries, addInquiry, updateInquiryStatus }}>
      {children}
    </LeadCaptureContext.Provider>
  );
}

export function useLeadCapture() {
  const ctx = useContext(LeadCaptureContext);
  if (!ctx) throw new Error("useLeadCapture must be used within LeadCaptureProvider");
  return ctx;
}
