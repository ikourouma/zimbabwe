"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function CookieBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsAccepted, setAnalyticsAccepted] = useState(true);

  useEffect(() => {
    const consent = localStorage.getItem("zimbabwe-cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
    try {
      const parsed = JSON.parse(consent);
      setAnalyticsAccepted(parsed.analytics ?? false);
    } catch {
      /* ignore */
    }
  }, []);

  const save = (analytics: boolean) => {
    localStorage.setItem("zimbabwe-cookie-consent", JSON.stringify({ essential: true, analytics }));
    setAnalyticsAccepted(analytics);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-50 animate-fade-in-up">
      <div
        className="p-6 rounded-lg border shadow-2xl backdrop-blur-md"
        style={{
          backgroundColor: "rgba(10, 10, 10, 0.95)",
          borderColor: "var(--color-sovereign-border)",
        }}
      >
        <div className="flex items-start gap-4 mb-5">
          <div
            className="p-2 rounded mt-0.5 shrink-0"
            style={{
              backgroundColor: "rgba(0,100,0,0.15)",
              border: "1px solid rgba(0,100,0,0.3)",
              color: "var(--color-zim-accent-pale)",
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Privacy & Cookie Consent</h3>
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              We use essential cookies for demo sessions and optional analytics cookies. Read our{" "}
              <Link href="/legal#cookies" className="underline" style={{ color: "var(--color-gold)" }}>
                Cookie Policy
              </Link>
              .
            </p>
          </div>
        </div>

        {showPreferences && (
          <div className="mb-5 p-4 rounded border space-y-4" style={{ backgroundColor: "rgba(0,0,0,0.2)", borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Essential Cookies</span>
              <span className="text-[10px] px-2 py-0.5 rounded border text-[var(--color-text-muted)]">Required</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Analytics Cookies</span>
              <input type="checkbox" checked={analyticsAccepted} onChange={(e) => setAnalyticsAccepted(e.target.checked)} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
          {showPreferences ? (
            <>
              <button type="button" onClick={() => setShowPreferences(false)} className="px-3 py-2 text-[var(--color-text-secondary)]">
                Cancel
              </button>
              <button type="button" onClick={() => save(analyticsAccepted)} className="btn-sovereign px-4 py-2">
                Save Preferences
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setShowPreferences(true)} className="px-3 py-2 text-[var(--color-text-secondary)]">
                Configure
              </button>
              <button type="button" onClick={() => save(false)} className="px-3 py-2 text-[var(--color-text-secondary)]">
                Decline Optional
              </button>
              <button type="button" onClick={() => save(true)} className="btn-sovereign px-4 py-2">
                Accept All
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
