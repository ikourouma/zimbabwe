import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config/site";
import { sectors } from "@/lib/data/taxonomies";
import { zimbabweProjects } from "@/lib/data/zimbabwe-projects";

const STATIC_ROUTES = [
  "",
  "/opportunity",
  "/platform",
  "/strategic-alignment",
  "/sectors",
  "/projects",
  "/about-afronovation",
  "/investor-journey",
  "/zimbabwe",
  "/contact",
  "/legal",
  "/auth/sign-up",
  "/strategic-partnerships",
  "/faq",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));

  const sectorEntries: MetadataRoute.Sitemap = sectors.map((sector) => ({
    url: `${SITE_URL}/sectors/${sector.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const projectEntries: MetadataRoute.Sitemap = zimbabweProjects
    .filter((p) => p.projectStatus === "published")
    .map((project) => ({
      url: `${SITE_URL}/projects/${project.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    }));

  return [...staticEntries, ...sectorEntries, ...projectEntries];
}
