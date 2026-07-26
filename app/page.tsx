import type { Metadata } from "next";
import { HomeCtaSection } from "@/components/sections/home-cta-section";
import { GatewayHeroCarousel } from "@/components/sections/gateway-hero-carousel";
import { ClassificationStrip } from "@/components/sections/classification-strip";
import { GatewayStrategicDirectory } from "@/components/sections/gateway-strategic-directory";
import { LandingFeaturedOpportunities } from "@/components/sections/landing-featured-opportunities";
import { InvestorEngagementProcess } from "@/components/sections/investor-engagement-process";
import { InvestorAccessTiers } from "@/components/sections/investor-access-tiers";
import { featuredProjectSlugs, zimbabweProjects } from "@/lib/data/zimbabwe-projects";
import { SITE_URL, SITE_NAME } from "@/lib/config/site";

export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  description:
    "Discover governed, searchable investment opportunities across Zimbabwe. Powered by Afronovation.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: SITE_NAME,
    description:
      "A sovereign-grade digital investment intelligence platform transforming ZIDA's static 2025 catalogue into a governed, investor-facing registry.",
    url: SITE_URL,
    type: "website",
  },
};

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
      <HomeCtaSection />
    </div>
  );
}
