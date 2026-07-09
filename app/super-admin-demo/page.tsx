"use client";

import { useState } from "react";
import type { ProjectStatus, VisibilityLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/context/project-store-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useLeadCapture } from "@/context/lead-capture-context";
import { useDemoPersona } from "@/context/demo-persona-context";
import { useSiteSettings } from "@/context/site-settings-context";
import { userRoles, sectors as seedSectors } from "@/lib/data/taxonomies";
import { getRequiredLevelForField, type AccessLevel } from "@/lib/entitlements/visibility";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { BarChart3, Layers, Users, Settings, Shield, Check, X, Plus, Trash2 } from "lucide-react";
import { SITE_URL } from "@/lib/config/site";

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Platform Concept", item: `${SITE_URL}/platform` },
    { "@type": "ListItem", position: 3, name: "Super Admin Demo", item: `${SITE_URL}/super-admin-demo` },
  ],
};

const ACCESS_LEVEL_ORDER: AccessLevel[] = ["public", "registered", "qualified", "admin"];
const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  public: "Public",
  registered: "Registered",
  qualified: "Qualified",
  admin: "Admin",
};

function levelMeets(level: AccessLevel, required: AccessLevel) {
  return ACCESS_LEVEL_ORDER.indexOf(level) >= ACCESS_LEVEL_ORDER.indexOf(required);
}

interface FieldVisibilityRow {
  label: string;
  requiredLevel: AccessLevel;
  interactive?: "cost-structure";
}

const FIELD_VISIBILITY_ROWS: FieldVisibilityRow[] = [
  { label: "Title, Sector & Location", requiredLevel: getRequiredLevelForField("title") },
  { label: "Opportunity Summary", requiredLevel: getRequiredLevelForField("opportunitySummary") },
  { label: "Cost Structure", requiredLevel: getRequiredLevelForField("capitalRequired"), interactive: "cost-structure" },
  { label: "Description & Scope", requiredLevel: getRequiredLevelForField("description") },
  { label: "Financial Indicators (IRR / NPV / ROI)", requiredLevel: getRequiredLevelForField("irr") },
  { label: "Documents & Investor Pack", requiredLevel: getRequiredLevelForField("documents") },
  { label: "Data Verification Status", requiredLevel: getRequiredLevelForField("dataVerificationStatus") },
];

export default function SuperAdminDemoPage() {
  const { projects, updateProject, resetProjects } = useProjectStore();
  const {
    sectors,
    pillars,
    ministries,
    contactReasons,
    provinces,
    updateSector,
    updateMinistry,
    addMinistry,
    removeMinistry,
    addProvince,
    renameProvince,
    removeProvince,
    resetTaxonomies,
  } = useTaxonomyStore();
  const [newProvince, setNewProvince] = useState("");
  const [newMinistry, setNewMinistry] = useState({ name: "", shortName: "" });
  const { inquiries } = useLeadCapture();
  const { setPersona } = useDemoPersona();
  const { costStructureHidden, setCostStructureHidden } = useSiteSettings();

  const [overrideProjectId, setOverrideProjectId] = useState("");
  const [overrideStatus, setOverrideStatus] = useState<ProjectStatus>("published");
  const [overrideVisibility, setOverrideVisibility] = useState<VisibilityLevel>("public");

  const statusCounts = projects.reduce(
    (acc, p) => {
      acc[p.projectStatus] = (acc[p.projectStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const sectorCounts = seedSectors.map((s) => ({
    name: s.name,
    count: projects.filter((p) => p.sectorId === s.id).length,
  }));

  const handleOverride = () => {
    if (!overrideProjectId) {
      toast.error("Select a project");
      return;
    }
    const now = new Date().toISOString();
    updateProject(overrideProjectId, {
      projectStatus: overrideStatus,
      visibilityLevel: overrideVisibility,
      publishedBy: overrideStatus === "published" ? "Afronovation Super Admin" : undefined,
      publishedAt: overrideStatus === "published" ? now : undefined,
    });
    toast.success("Publishing override applied");
  };

  return (
    <div className="page-container py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Badge variant="gold" className="mb-4">Afronovation Super Admin — Demo Preview</Badge>
      <h1>Platform Control</h1>
      <p className="text-zim-muted mt-2 mb-6">
        Afronovation super admin control over taxonomies, entitlements, tenant settings, analytics, and publishing overrides.
      </p>

      <Tabs defaultValue="analytics">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="taxonomies">Taxonomies</TabsTrigger>
          <TabsTrigger value="roles">Users & Roles</TabsTrigger>
          <TabsTrigger value="tenant">Tenant Settings</TabsTrigger>
          <TabsTrigger value="override">Publishing Override</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-zim-green-700" />
                <div>
                  <div className="text-2xl font-bold">{projects.length}</div>
                  <div className="text-xs text-zim-muted">Total Projects</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Layers className="h-8 w-8 text-zim-green-700" />
                <div>
                  <div className="text-2xl font-bold">{statusCounts.published ?? 0}</div>
                  <div className="text-xs text-zim-muted">Published</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-8 w-8 text-zim-green-700" />
                <div>
                  <div className="text-2xl font-bold">{inquiries.length}</div>
                  <div className="text-xs text-zim-muted">Lead Inquiries</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Shield className="h-8 w-8 text-zim-green-700" />
                <div>
                  <div className="text-2xl font-bold">{reviewQueueCount(projects)}</div>
                  <div className="text-xs text-zim-muted">In Review</div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Projects by Sector</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sectorCounts.map(({ name, count }) => (
                  <div key={name} className="flex justify-between text-sm">
                    <span>{name}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxonomies" className="mt-6 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Sectors</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectors.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Input
                          defaultValue={s.name}
                          onBlur={(e) => updateSector(s.id, { name: e.target.value })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => toast.success("Sector updated (demo)")}>Save</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Provinces ({provinces.length})</CardTitle>
              <p className="text-sm text-zim-muted mt-1">
                Canonical province registry — drives the province count shown platform-wide. This is a template
                pattern reusable for other countries&apos; administrative divisions.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {provinces.map((p, i) => (
                    <TableRow key={`${p}-${i}`}>
                      <TableCell>
                        <Input
                          defaultValue={p}
                          onBlur={(e) => renameProvince(i, e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => removeProvince(i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center gap-2 mt-4">
                <Input
                  placeholder="New province name"
                  value={newProvince}
                  onChange={(e) => setNewProvince(e.target.value)}
                  className="h-8 max-w-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!newProvince.trim()) return;
                    addProvince(newProvince);
                    setNewProvince("");
                    toast.success("Province added");
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Province
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ministries ({ministries.length})</CardTitle>
              <p className="text-sm text-zim-muted mt-1">
                Every project on the platform aligns to at least one beneficiary ministry, alongside its sector(s),
                strategic pillar(s), and SDG(s) — this is the institutional-alignment source of truth shown across
                the registry, Deal Room, and Strategic Alignment page. Ministry names only — no named officials are
                ever stored or displayed publicly. Representative Title is an optional, illustrative office title
                (e.g. &quot;Director of Investment Promotion&quot;) surfaced only inside the gated Deal Room.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ministry Name</TableHead>
                    <TableHead>Short Name</TableHead>
                    <TableHead>Representative Title (Deal Room only)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ministries.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Input
                          defaultValue={m.name}
                          onBlur={(e) => updateMinistry(m.id, { name: e.target.value })}
                          className="h-8 min-w-[260px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          defaultValue={m.shortName}
                          onBlur={(e) => updateMinistry(m.id, { shortName: e.target.value })}
                          className="h-8 w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          defaultValue={m.representativeTitle ?? ""}
                          placeholder="e.g. Director of Investment Promotion"
                          onBlur={(e) => updateMinistry(m.id, { representativeTitle: e.target.value || undefined })}
                          className="h-8 min-w-[220px]"
                        />
                      </TableCell>
                      <TableCell><Badge variant="outline">{m.status.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            removeMinistry(m.id);
                            toast.success("Ministry removed");
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <Input
                  placeholder="New ministry name"
                  value={newMinistry.name}
                  onChange={(e) => setNewMinistry({ ...newMinistry, name: e.target.value })}
                  className="h-8 max-w-xs"
                />
                <Input
                  placeholder="Short name"
                  value={newMinistry.shortName}
                  onChange={(e) => setNewMinistry({ ...newMinistry, shortName: e.target.value })}
                  className="h-8 max-w-[140px]"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!newMinistry.name.trim() || !newMinistry.shortName.trim()) {
                      toast.error("Ministry name and short name are required");
                      return;
                    }
                    addMinistry({
                      name: newMinistry.name.trim(),
                      shortName: newMinistry.shortName.trim(),
                      type: "beneficiary",
                      status: "pending_validation",
                    });
                    setNewMinistry({ name: "", shortName: "" });
                    toast.success("Ministry added");
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Ministry
                </Button>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Strategic Pillars ({pillars.length})</CardTitle></CardHeader>
              <CardContent className="text-sm text-zim-muted">Admin-managed — {pillars.length} pillars configured</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Contact Reasons ({contactReasons.length})</CardTitle></CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {contactReasons.map((cr) => <li key={cr.id}>{cr.label}</li>)}
                </ul>
              </CardContent>
            </Card>
          </div>
          <Button variant="outline" onClick={() => { resetTaxonomies(); toast.success("Taxonomies reset to seed defaults"); }}>
            Reset Taxonomies
          </Button>
        </TabsContent>

        <TabsContent value="roles" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Field Visibility Matrix</CardTitle>
              <p className="text-sm text-zim-muted mt-1">
                Reference view of entitlement rules by field group. Cost Structure has a live sitewide kill switch —
                every other row reflects the platform&apos;s existing, non-editable access rules.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field Group</TableHead>
                    {ACCESS_LEVEL_ORDER.map((level) => (
                      <TableHead key={level} className="text-center">{ACCESS_LEVEL_LABELS[level]}</TableHead>
                    ))}
                    <TableHead className="text-right">Sitewide Control</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FIELD_VISIBILITY_ROWS.map((row) => {
                    const isCostStructure = row.interactive === "cost-structure";
                    const rowHidden = isCostStructure && costStructureHidden;
                    return (
                      <TableRow key={row.label}>
                        <TableCell className="font-medium">
                          {row.label}
                          {rowHidden && (
                            <Badge variant="warning" className="ml-2">Hidden sitewide</Badge>
                          )}
                        </TableCell>
                        {ACCESS_LEVEL_ORDER.map((level) => {
                          const meets = levelMeets(level, row.requiredLevel) && !rowHidden;
                          return (
                            <TableCell key={level} className="text-center">
                              {meets ? (
                                <Check className="h-4 w-4 text-zim-green-700 inline" />
                              ) : (
                                <X className={cn("h-4 w-4 inline", rowHidden ? "text-zim-muted/50" : "text-zim-muted/40")} />
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right">
                          {isCostStructure ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-zim-muted">{costStructureHidden ? "Hidden" : "Visible"}</span>
                              <Switch
                                checked={!costStructureHidden}
                                onCheckedChange={(checked) => {
                                  setCostStructureHidden(!checked);
                                  toast.success(checked ? "Cost Structure shown sitewide" : "Cost Structure hidden sitewide");
                                }}
                                aria-label="Toggle Cost Structure visibility sitewide"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-zim-muted">Fixed rule</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">User Roles & Entitlements</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Permissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell><Badge variant="outline">{role.scope}</Badge></TableCell>
                      <TableCell className="text-xs text-zim-muted">{role.permissions.join(", ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenant" className="mt-6">
          <Card>
            <CardHeader>
              <Settings className="h-6 w-6 text-zim-green-700 mb-2" />
              <CardTitle className="text-base">Country / Tenant Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Tenant</Label><Input defaultValue="Zimbabwe / ZIDA" disabled /></div>
                <div><Label>Platform Owner</Label><Input defaultValue="Afronovation" disabled /></div>
                <div><Label>Default Visibility</Label><Input defaultValue="Public (high-level), Registered (details)" disabled /></div>
                <div><Label>Governance Mode</Label><Input defaultValue="Review required before publish" disabled /></div>
              </div>
              <Badge variant="warning">Demo settings — not persisted to production</Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="override" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Publishing Override</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zim-muted">
                Super Admin can override project status and visibility — bypassing normal institutional workflow when required.
              </p>
              <div>
                <Label>Project</Label>
                <Select value={overrideProjectId} onValueChange={setOverrideProjectId}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title.slice(0, 50)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Force Status</Label>
                  <Select value={overrideStatus} onValueChange={(v) => setOverrideStatus(v as ProjectStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["draft", "under_review", "approved", "published", "archived"] as ProjectStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Visibility Level</Label>
                  <Select value={overrideVisibility} onValueChange={(v) => setOverrideVisibility(v as VisibilityLevel)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="registered">Registered</SelectItem>
                      <SelectItem value="qualified_investor">Qualified Investor</SelectItem>
                      <SelectItem value="admin_only">Admin Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleOverride}>Apply Override</Button>
            </CardContent>
          </Card>
          <div className="mt-4">
            <Button variant="outline" onClick={() => { resetProjects(); toast.success("Projects reset to seed defaults"); }}>
              Reset All Projects to Seed
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <button type="button" className="text-sm text-zim-green-700 underline" onClick={() => setPersona("super_admin")}>
          Switch to Super Admin persona in header
        </button>
      </div>
    </div>
  );
}

function reviewQueueCount(projects: { projectStatus: string }[]) {
  return projects.filter((p) =>
    ["submitted_for_review", "under_review", "changes_requested", "approved"].includes(p.projectStatus)
  ).length;
}
