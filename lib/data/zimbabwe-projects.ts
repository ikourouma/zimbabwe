import { convertSeedProjects } from "./seed-converter";
import { zimbabweSeedProjects } from "./seed-raw";

export const zimbabweProjects = convertSeedProjects(zimbabweSeedProjects);

export function getProjectBySlug(slug: string) {
  return zimbabweProjects.find((p) => p.slug === slug);
}

export function getProjectById(id: string) {
  return zimbabweProjects.find((p) => p.id === id);
}

export function getPublishedProjects() {
  return zimbabweProjects.filter((p) => p.projectStatus === "published");
}

export function getProjectsBySector(sectorId: string) {
  return zimbabweProjects.filter((p) => p.sectorId === sectorId && p.projectStatus === "published");
}

export const featuredProjectSlugs = [
  "masuwe-international-medical-center",
  "goromonzi-agro-processing-industrial-park-sez",
  "telone-fibre-to-the-home-ftth-deployment",
  "sirdc-integrated-foundry-manhize-industrial-park",
  "hwange-50mw-solar-power-plant-project",
  "sunway-city-sez-high-tech-park",
];
