import type { Metadata } from "next";
import { getProjectBySlug } from "@/lib/data/zimbabwe-projects";
import { SITE_URL } from "@/lib/config/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    return { title: "Project Not Found" };
  }

  const pageUrl = `${SITE_URL}/projects/${project.slug}`;
  const description = project.opportunitySummary;

  return {
    title: project.title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: project.title,
      description,
      url: pageUrl,
      type: "website",
    },
  };
}

export default function ProjectDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
