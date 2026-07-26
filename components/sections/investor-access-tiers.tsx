"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/cinematic-reveal";
import { useTranslations } from "@/context/locale-context";

export function InvestorAccessTiers() {
  const t = useTranslations();
  const accessTiers = t.accessTiers;
  return (
    <section className="py-24" style={{ backgroundColor: "#050805" }}>
      <div className="page-container">
        <FadeUp className="mb-16 max-w-2xl">
          <p className="section-overline mb-4">{t.home.accessTiers.overline}</p>
          <h2 className="text-3xl font-light text-white" style={{ letterSpacing: "var(--type-heading-tracking)" }}>
            {t.home.accessTiers.title}
          </h2>
          <p className="mt-3 text-base" style={{ color: "var(--color-text-secondary)" }}>
            {t.home.accessTiers.subtitle}
          </p>
        </FadeUp>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {accessTiers.map((tier) => (
            <StaggerItem key={tier.id}>
              <div
                className="h-full p-8 rounded-xl border flex flex-col"
                style={{
                  backgroundColor: "featured" in tier && tier.featured ? "rgba(255, 211, 0, 0.05)" : "rgba(255,255,255,0.02)",
                  borderColor: "featured" in tier && tier.featured ? "var(--color-gold)" : "var(--color-sovereign-border)",
                }}
              >
                <p className="section-overline mb-3">{tier.label}</p>
                <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                  {tier.description}
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-white/90">
                      <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-gold)" }} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.cta.href}
                  className={
                    "featured" in tier && tier.featured
                      ? "btn-sovereign justify-center whitespace-nowrap"
                      : "btn-sovereign-ghost justify-center whitespace-nowrap"
                  }
                >
                  {tier.cta.label}
                </Link>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
