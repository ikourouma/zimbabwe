import Link from "next/link";
import { GatewayHeroCarousel } from "@/components/sections/gateway-hero-carousel";
import { ClassificationStrip } from "@/components/sections/classification-strip";
import { GatewayStrategicDirectory } from "@/components/sections/gateway-strategic-directory";
import { LandingFeaturedOpportunities } from "@/components/sections/landing-featured-opportunities";
import { InvestorEngagementProcess } from "@/components/sections/investor-engagement-process";
import { InvestorAccessTiers } from "@/components/sections/investor-access-tiers";
import { featuredProjectSlugs, zimbabweProjects } from "@/lib/data/zimbabwe-projects";

export default function HomePage() {
  const featured = featuredProjectSlugs
    .map((slug) => zimbabweProjects.find((p) => p.slug === slug))
    .filter(Boolean)
    .slice(0, 6);

  return (
    <div>
      <GatewayHeroCarousel />
      <ClassificationStrip />
      <GatewayStrategicDirectory />
      <LandingFeaturedOpportunities projects={featured as NonNullable<(typeof featured)[number]>[]} />
      <InvestorEngagementProcess />
      <InvestorAccessTiers />
      <section className="py-16" style={{ backgroundColor: "var(--color-zim-green)" }}>
        <div className="page-container flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          <div>
            <h2 className="text-2xl font-light text-white mb-2" style={{ letterSpacing: "var(--type-heading-tracking)" }}>
              Ready to invest in Zimbabwe?
            </h2>
            <p className="text-white/85 text-sm">Register for full project detail — verified investors unlock capital estimates and financial indicators.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/register" className="btn-sovereign bg-[var(--color-gold)] text-black hover:opacity-90">
              Register
            </Link>
            <Link href="/investor-journey" className="btn-sovereign-ghost border-white/30">
              Investor Journey
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
