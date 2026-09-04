"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { MarketingPopup } from "@/lib/types";

const SESSION_KEY = "zim:marketing-popup-shown";

/**
 * Public-site marketing popup (Platform Feedback Batch v4, Phase 9). Mount only from the
 * marketing LayoutChrome branch — never inside dashboard consoles. One impression per browser
 * session: the highest-priority active popup is shown, then sessionStorage blocks another
 * until the tab/session ends.
 */
export function MarketingPopupModal() {
  const [popup, setPopup] = useState<MarketingPopup | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    let cancelled = false;
    fetch("/api/marketing-popups")
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: MarketingPopup[]) => {
        if (cancelled) return;
        const next = rows[0];
        if (!next) return;
        setPopup(next);
        setOpen(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, popup?.id ?? "1");
    setOpen(false);
  };

  if (!open || !popup) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="marketing-popup-title">
      <button type="button" className="absolute inset-0 bg-black/65" aria-label="Dismiss" onClick={dismiss} />
      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-xl shadow-2xl"
        style={{ backgroundColor: "var(--color-nav-bg)", border: "1px solid var(--color-nav-border)" }}
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 rounded-full p-1.5 text-white/80 hover:text-white"
          aria-label="Close"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
        >
          <X className="h-4 w-4" />
        </button>
        {popup.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={popup.imageUrl} alt="" className="h-44 w-full object-cover" />
        )}
        <div className="p-5 space-y-2">
          <h2 id="marketing-popup-title" className="text-lg font-semibold text-white pr-8">
            {popup.title}
          </h2>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {popup.body}
          </p>
          {popup.subtext && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {popup.subtext}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-3">
            <button type="button" onClick={dismiss} className="btn-sovereign-ghost text-xs px-4 py-2">
              Dismiss
            </button>
            {popup.linkHref && (
              <Link href={popup.linkHref} onClick={dismiss} className="btn-sovereign text-xs px-4 py-2">
                {popup.linkLabel || "Learn more"}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
