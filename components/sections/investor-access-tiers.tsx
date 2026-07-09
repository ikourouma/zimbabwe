"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/cinematic-reveal";
import { accessTiers } from "@/content/zimbabwe-site";

export function InvestorAccessTiers() {
  return (
    <section className="py-24" style={{ backgroundColor: "#050805" }}>
      <div className="page-container">
        <FadeUp className="mb-16 max-w-2xl">
          <p className="section-overline mb-4">Investor Access Tiers</p>
          <h2 className="text-3xl font-light text-white" style={{ letterSpacing: "var(--type-heading-tracking)" }}>
            Governed access, calibrated to your role
          </h2>
          <p className="mt-3 text-base" style={{ color: "var(--color-text-secondary)" }}>
            Every project follows a draft → review → publish workflow, with entitlements that expand as investors
            register and qualify.
          </p>
        </FadeUp>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {accessTiers.map((tier) => (
            <StaggerItem key={tier.id}>
              <div
                className="h-full p-8 rounded-xl border flex flex-col"
                style={{
                  backgroundColor: tier.featured ? "rgba(255, 211, 0, 0.05)" : "rgba(255,255,255,0.02)",
                  borderColor: tier.featured ? "var(--color-gold)" : "var(--color-sovereign-border)",
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
                  className={tier.featured ? "btn-sovereign justify-center" : "btn-sovereign-ghost justify-center"}
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
