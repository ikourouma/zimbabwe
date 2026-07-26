import type { Metadata } from "next";
import { getSectorBySlug } from "@/lib/data/taxonomies";
import { SITE_URL } from "@/lib/config/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sector: string }>;
}): Promise<Metadata> {
  const { sector: slug } = await params;
  const sector = getSectorBySlug(slug);

  if (!sector) {
    return { title: "Sector Not Found" };
  }

  const pageUrl = `${SITE_URL}/sectors/${sector.slug}`;

  return {
    title: sector.name,
    description: sector.description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: `${sector.name} — Priority Sector`,
      description: sector.description,
      url: pageUrl,
      type: "website",
    },
  };
}

export default function SectorDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
