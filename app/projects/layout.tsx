import type { Metadata } from "next";
import { SITE_URL } from "@/lib/config/site";

const PAGE_URL = `${SITE_URL}/projects`;

export const metadata: Metadata = {
  title: "Project Registry",
  description:
    "Searchable, filterable catalogue of governed ZIDA 2025 investment opportunities across Zimbabwe's priority sectors.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "ZIDA Project Registry",
    description: "Browse Zimbabwe's governed, searchable investment project registry.",
    url: PAGE_URL,
    type: "website",
  },
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
