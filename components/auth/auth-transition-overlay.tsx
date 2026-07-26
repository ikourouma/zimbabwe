"use client";

import Image from "next/image";
import { useAuthTransition } from "@/context/auth-transition-context";
import { useTranslations } from "@/context/locale-context";

export function AuthTransitionOverlay() {
  const { phase } = useAuthTransition();
  const t = useTranslations();

  if (phase === "idle") return null;

  const label = phase === "signing_in" ? t.auth.signingIn : t.auth.signingOut;

  return (
    <div
      className="auth-transition-overlay fixed inset-0 z-[100] flex flex-col items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="auth-transition-orbit" aria-hidden="true">
        <div className="auth-transition-ring" />
        <div className="auth-transition-icon-wrap">
          <Image
            src="/brand/zimbabwe-map-icon.png"
            alt=""
            width={72}
            height={72}
            className="auth-transition-icon object-contain"
            priority
          />
        </div>
      </div>
      <p className="mt-8 text-sm font-medium tracking-wide text-white/90">{label}</p>
    </div>
  );
}
