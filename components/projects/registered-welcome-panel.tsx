"use client";

import Link from "next/link";
import { PartyPopper, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "@/context/locale-context";
import { useAuth } from "@/context/auth-context";

const WELCOME_DISMISSED_KEY = "zim-welcome-dismissed";

interface RegisteredWelcomePanelProps {
  showWelcomeParam: boolean;
}

export function RegisteredWelcomePanel({ showWelcomeParam }: RegisteredWelcomePanelProps) {
  const t = useTranslations();
  const { isAuthenticated, isRegistered, isQualified, isAdmin, isLoading } = useAuth();
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || isQualified || isAdmin) return;

    const dismissed = sessionStorage.getItem(WELCOME_DISMISSED_KEY) === "true";
    if (showWelcomeParam || (isRegistered && !dismissed)) {
      setVisible(true);
    }
  }, [isLoading, isAuthenticated, isRegistered, isQualified, isAdmin, showWelcomeParam]);

  // Fresh sign-ins land here mid-scroll on some viewports — pull the panel into view so the
  // "you're actually logged in" confirmation can't be missed, per the Fortune-100 login-feedback
  // audit finding.
  useEffect(() => {
    if (visible) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [visible]);

  const dismiss = () => {
    sessionStorage.setItem(WELCOME_DISMISSED_KEY, "true");
    setVisible(false);
    if (showWelcomeParam && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("welcome");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  };

  const wp = t.welcomePanel;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 rounded-lg border-l-4 border p-5 relative shadow-sm"
          style={{
            borderLeftColor: "#ffd300",
            borderColor: "rgba(255, 211, 0, 0.35)",
            backgroundColor: "rgba(255, 211, 0, 0.08)",
          }}
        >
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-3 right-3 p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
            aria-label={wp.dismiss}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3 pr-8">
            <div
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(255, 211, 0, 0.18)" }}
            >
              <PartyPopper className="h-4 w-4" style={{ color: "#8a6d00" }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-zim-green-900 mb-1">{wp.title}</p>
              <p className="text-sm text-zim-muted max-w-2xl">{wp.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 ml-12">
            <Link href="/strategic-partnerships" className="btn-sovereign text-xs px-4 py-2 whitespace-nowrap">
              {wp.cta}
            </Link>
            <button
              type="button"
              onClick={dismiss}
              // `.btn-sovereign-ghost` hardcodes white text for the dark dashboard shell — this
              // panel lives on the light public `/projects` page, so it needs the light-shell ink
              // color explicitly, or the label is invisible (feedback item 19).
              className="btn-sovereign-ghost text-xs px-4 py-2 whitespace-nowrap"
              style={{ color: "var(--color-ink)" }}
            >
              {wp.dismiss}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
