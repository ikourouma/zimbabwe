import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mdPath = path.join(__dirname, "../docs/data/Zimbabwe_ZIDA_Seed_Projects_v1.0.md");
const outPath = path.join(__dirname, "../lib/data/seed-raw.ts");

const md = fs.readFileSync(mdPath, "utf8");
const startMarker = "export const zimbabweSeedProjects: SeedProject[] = [";
const startIdx = md.indexOf(startMarker);
if (startIdx === -1) throw new Error("Could not find seed projects array");

const closeIdx = md.indexOf("\n];", startIdx);
if (closeIdx === -1) throw new Error("Could not find end of array");

const arrayContent = md.slice(
  startIdx + "export const zimbabweSeedProjects: SeedProject[] = ".length,
  closeIdx + 3
);

// Workflow state overrides applied in seed-converter.ts after conversion

const output = `import type { SeedProject } from "@/lib/types";

/** Raw seed projects extracted from docs/data/Zimbabwe_ZIDA_Seed_Projects_v1.0.md */
export const zimbabweSeedProjects: SeedProject[] = ${arrayContent};
`;

fs.writeFileSync(outPath, output);
console.log("Generated", outPath, "with", (arrayContent.match(/id: "zim-/g) || []).length, "projects");
