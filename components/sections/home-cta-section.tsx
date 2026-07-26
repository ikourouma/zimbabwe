"use client";

import Link from "next/link";
import { useTranslations } from "@/context/locale-context";

export function HomeCtaSection() {
  const t = useTranslations();

  return (
    <section className="py-16" style={{ backgroundColor: "var(--color-zim-green)" }}>
      <div className="page-container flex flex-col md:flex-row items-center justify-between gap-6 text-white">
        <div>
          <h2 className="text-2xl font-light text-white mb-2" style={{ letterSpacing: "var(--type-heading-tracking)" }}>
            {t.home.cta.title}
          </h2>
          <p className="text-white/85 text-sm">{t.home.cta.subtitle}</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link href="/register" className="btn-sovereign whitespace-nowrap bg-[var(--color-gold)] text-black hover:opacity-90">
            {t.home.cta.register}
          </Link>
          <Link href="/investor-journey" className="btn-sovereign-ghost whitespace-nowrap border-white/30">
            {t.home.cta.investorJourney}
          </Link>
        </div>
      </div>
    </section>
  );
}
