"use client";

import Link from "next/link";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/cinematic-reveal";
import { engagementSteps } from "@/content/zimbabwe-site";

export function InvestorEngagementProcess() {
  return (
    <section className="py-24" style={{ backgroundColor: "var(--color-sovereign-midnight)" }}>
      <div className="page-container">
        <FadeUp className="mb-16 max-w-2xl">
          <p className="section-overline mb-4">Engagement Pathway</p>
          <h2 className="text-3xl font-light text-white" style={{ letterSpacing: "var(--type-heading-tracking)" }}>
            From discovery to strategic partnership
          </h2>
          <p className="mt-3 text-base" style={{ color: "var(--color-text-secondary)" }}>
            A governed, four-step pathway for institutional investors engaging with Zimbabwe&apos;s ZIDA project pipeline.
          </p>
        </FadeUp>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {engagementSteps.map((item) => (
            <StaggerItem key={item.step}>
              <Link href={item.href} className="group block h-full">
                <div
                  className="h-full p-6 rounded-xl border transition-all duration-300 hover:-translate-y-0.5"
                  style={{ backgroundColor: "rgba(255,255,255,0.02)", borderColor: "var(--color-sovereign-border)" }}
                >
                  <p className="text-4xl font-light mb-6" style={{ color: "var(--color-gold)" }}>
                    {item.step}
                  </p>
                  <h3
                    className="text-lg font-medium text-white mb-2 group-hover:text-[var(--color-gold)] transition-colors"
                    style={{ letterSpacing: "var(--type-heading-tracking)" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {item.desc}
                  </p>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
