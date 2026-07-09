"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, FileText, CalendarClock, Handshake } from "lucide-react";
import { useDemoPersona } from "@/context/demo-persona-context";
import { useLeadCapture } from "@/context/lead-capture-context";
import { useProjectStore } from "@/context/project-store-context";
import { sectors } from "@/lib/data/taxonomies";
import { getRoutingDesk } from "@/lib/data/routing-desks";
import type { LeadInquiry } from "@/lib/types";
import { cn } from "@/lib/utils";

type EngagementType = "investor" | "government_dfi" | "strategic_partner";
type AskType = "document_request" | "meeting_request" | "investment_interest";

const FILLED_BG = "#FFD300";
const EMPTY_BG = "rgba(255,255,255,0.03)";
const BORDER = "1px solid rgba(255,255,255,0.1)";

function fieldStyle(hasValue: boolean) {
  return {
    backgroundColor: hasValue ? FILLED_BG : EMPTY_BG,
    color: hasValue ? "#000" : "var(--color-text-primary)",
    border: BORDER,
  };
}

const chevronBg = (filled: boolean) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='${
    filled ? "%23000" : "%236b7280"
  }' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`;

const selectStyle = (hasValue: boolean) => ({
  ...fieldStyle(hasValue),
  color: hasValue ? "#000" : "var(--color-text-muted)",
  backgroundImage: chevronBg(hasValue),
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 1rem center",
  backgroundSize: "1rem",
});

const ENGAGEMENT_OPTIONS: { id: EngagementType; label: string; desc: string }[] = [
  { id: "investor", label: "Investor", desc: "Institutional, private capital, or diaspora investment mandate" },
  { id: "government_dfi", label: "Government / DFI", desc: "Ministry, agency, or development finance institution" },
  { id: "strategic_partner", label: "Strategic or Technical Partner", desc: "Implementation, technical assistance, or commercial partnership" },
];

const ASK_META: Record<AskType, { label: string; icon: typeof FileText }> = {
  document_request: { label: "Document Access", icon: FileText },
  meeting_request: { label: "Meeting Request", icon: CalendarClock },
  investment_interest: { label: "Investment Interest", icon: Handshake },
};

const investorTypes = [
  "Individual Investor",
  "Institutional Investor",
  "Development Finance Institution",
  "Diaspora Investor",
  "Strategic Partner",
  "Government / Institutional",
];

const ticketSizeRanges = ["<$1M", "$1M–$5M", "$5M–$25M", "$25M+", "Not yet determined"];
const natureOfEngagementOptions = ["Co-financing", "Policy Dialogue", "MOU / Partnership", "Technical Assistance"];
const partnershipTypeOptions = ["Technical Assistance", "Commercial Partnership", "Capacity Building", "Other"];

interface FormState {
  engagementType: EngagementType | "";
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  phone: string;
  investorType: string;
  sectorIds: string[];
  ticketSizeRange: string;
  ministryRepresented: string;
  natureOfEngagement: string;
  partnershipType: string;
  objective: string;
}

const INITIAL_FORM: FormState = {
  engagementType: "",
  firstName: "",
  lastName: "",
  email: "",
  organization: "",
  phone: "",
  investorType: "",
  sectorIds: [],
  ticketSizeRange: "",
  ministryRepresented: "",
  natureOfEngagement: "",
  partnershipType: "",
  objective: "",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-mono tracking-widest uppercase mb-1.5" style={{ color: "var(--color-text-muted)" }}>
      {children}
    </label>
  );
}

const inputClass =
  "w-full px-3 py-2.5 rounded text-sm transition-colors outline-none focus:bg-[#FFD300] focus:text-black placeholder-gray-600";

export function EngagementWizard() {
  const { persona } = useDemoPersona();
  const { addInquiry } = useLeadCapture();
  const { getProject } = useProjectStore();

  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [ask, setAsk] = useState<AskType | undefined>(undefined);
  const [paramsResolved, setParamsResolved] = useState(false);

  // Read ?projectId=&ask= client-side (not useSearchParams()) so this route can stay a plain
  // static page rather than being forced behind a Suspense boundary — same convention used by
  // /projects for its ?pillarId=/?sdgId=/?sectorId= deep-links.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("projectId");
    const askParam = params.get("ask") as AskType | null;
    if (pid && getProject(pid)) setProjectId(pid);
    if (askParam && askParam in ASK_META) setAsk(askParam);
    setParamsResolved(true);
  }, [getProject]);

  const project = projectId ? getProject(projectId) : undefined;
  const isProjectLinked = paramsResolved && Boolean(project);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [routedDesk, setRoutedDesk] = useState<string>("");

  useEffect(() => {
    if (isProjectLinked) {
      setForm((f) => (f.engagementType ? f : { ...f, engagementType: "investor" }));
    }
  }, [isProjectLinked]);

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const toggleSector = (sectorId: string) => {
    setForm((f) => ({
      ...f,
      sectorIds: f.sectorIds.includes(sectorId)
        ? f.sectorIds.filter((id) => id !== sectorId)
        : [...f.sectorIds, sectorId],
    }));
  };

  const step1Valid = Boolean(form.engagementType && form.firstName && form.lastName && form.email && form.organization);

  const step2Valid = (() => {
    if (isProjectLinked) return true;
    switch (form.engagementType) {
      case "investor":
        return Boolean(form.investorType && form.sectorIds.length > 0 && form.ticketSizeRange);
      case "government_dfi":
        return Boolean(form.ministryRepresented && form.natureOfEngagement);
      case "strategic_partner":
        return Boolean(form.partnershipType && form.sectorIds.length > 0);
      default:
        return false;
    }
  })();

  const step3Valid = Boolean(form.objective);

  const canAdvance = step === 1 ? step1Valid : step === 2 ? step2Valid : step3Valid;

  const handleSubmit = () => {
    const desk = getRoutingDesk(form.engagementType || undefined, isProjectLinked);
    setRoutedDesk(desk);

    const name = `${form.firstName} ${form.lastName}`.trim();

    if (isProjectLinked && project && ask) {
      addInquiry({
        type: ask,
        name,
        email: form.email,
        phone: form.phone || undefined,
        organization: form.organization,
        projectId: project.id,
        engagementType: form.engagementType || undefined,
        message: `${ASK_META[ask].label} — ${project.title}. ${form.objective}`,
      });
    } else {
      const inquiry: Omit<LeadInquiry, "id" | "createdAt"> = {
        type: "strategic_partnership",
        name,
        email: form.email,
        phone: form.phone || undefined,
        organization: form.organization,
        engagementType: form.engagementType || undefined,
        message: form.objective,
      };

      if (form.engagementType === "investor") {
        Object.assign(inquiry, {
          investorType: form.investorType,
          sectorIds: form.sectorIds,
          ticketSizeRange: form.ticketSizeRange,
        });
      } else if (form.engagementType === "government_dfi") {
        Object.assign(inquiry, {
          ministryRepresented: form.ministryRepresented,
          natureOfEngagement: form.natureOfEngagement,
        });
      } else if (form.engagementType === "strategic_partner") {
        Object.assign(inquiry, {
          partnershipType: form.partnershipType,
          sectorIds: form.sectorIds,
        });
      }

      addInquiry(inquiry);
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,100,0,0.15)", border: "1px solid rgba(0,100,0,0.35)" }}
        >
          <Check className="w-8 h-8" style={{ color: "#86efac" }} />
        </div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
          Inquiry Submitted
        </h2>
        <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--color-text-secondary)" }}>
          Thank you, {form.firstName}. Your inquiry has been routed to the:
        </p>
        <p
          className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold mb-6"
          style={{ backgroundColor: "rgba(255,211,0,0.1)", border: "1px solid rgba(255,211,0,0.3)", color: "var(--color-gold)" }}
        >
          {routedDesk}
        </p>
        <p className="text-sm leading-relaxed mb-10" style={{ color: "var(--color-text-secondary)" }}>
          In a production deployment, this desk would follow up directly at {form.email}. This demo stores the
          inquiry locally for the admin inbox preview.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/projects" className="btn-sovereign justify-center text-center">
            Browse Project Registry
          </Link>
          <Link href="/" className="btn-sovereign-ghost justify-center text-center">
            Return to Platform
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-10">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-3 flex-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
              style={{
                backgroundColor: s <= step ? "var(--color-gold)" : "rgba(255,255,255,0.06)",
                color: s <= step ? "#000" : "var(--color-text-muted)",
                border: s <= step ? "none" : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className="h-px flex-1"
                style={{ backgroundColor: s < step ? "var(--color-gold)" : "rgba(255,255,255,0.1)" }}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs font-mono tracking-widest uppercase mb-8 text-center" style={{ color: "var(--color-text-muted)" }}>
        Step {step} of 3 —{" "}
        {step === 1 ? "Who You Are & Why" : step === 2 ? "Your Interest" : "Mandate & Review"}
      </p>

      <div className="executive-card">
        {step === 1 && (
          <div className="space-y-5">
            {isProjectLinked && project && ask ? (
              <div
                className="flex items-start gap-3 p-4 rounded"
                style={{ backgroundColor: "rgba(255,211,0,0.06)", border: "1px solid rgba(255,211,0,0.25)" }}
              >
                {(() => {
                  const Icon = ASK_META[ask].icon;
                  return <Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--color-gold)" }} />;
                })()}
                <div>
                  <p className="text-xs font-mono tracking-widest uppercase mb-1" style={{ color: "var(--color-gold)" }}>
                    Regarding: {project.title}
                  </p>
                  <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    Ask: {ASK_META[ask].label}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Label>Engagement Type</Label>
                <div className="grid gap-2">
                  {ENGAGEMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => update({ engagementType: opt.id })}
                      className="text-left px-4 py-3 rounded transition-colors"
                      style={{
                        backgroundColor: form.engagementType === opt.id ? "rgba(255,211,0,0.1)" : EMPTY_BG,
                        border: form.engagementType === opt.id ? "1px solid var(--color-gold)" : BORDER,
                      }}
                    >
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        {opt.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <input
                  value={form.firstName}
                  onChange={(e) => update({ firstName: e.target.value })}
                  className={inputClass}
                  style={fieldStyle(!!form.firstName)}
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <input
                  value={form.lastName}
                  onChange={(e) => update({ lastName: e.target.value })}
                  className={inputClass}
                  style={fieldStyle(!!form.lastName)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update({ email: e.target.value })}
                  placeholder="name@org.com"
                  className={inputClass}
                  style={fieldStyle(!!form.email)}
                />
              </div>
              <div>
                <Label>Organization</Label>
                <input
                  value={form.organization}
                  onChange={(e) => update({ organization: e.target.value })}
                  placeholder="Fund / Ministry / Firm"
                  className={inputClass}
                  style={fieldStyle(!!form.organization)}
                />
              </div>
            </div>

            <div>
              <Label>Phone (optional)</Label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update({ phone: e.target.value })}
                placeholder="+263 771 234 567"
                className={inputClass}
                style={fieldStyle(!!form.phone)}
              />
            </div>

            {persona === "public" && (
              <p className="text-xs pt-2" style={{ color: "var(--color-text-muted)" }}>
                Just want browsing access to the registry?{" "}
                <Link href="/register" className="underline" style={{ color: "var(--color-gold)" }}>
                  Register here →
                </Link>
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            {!isProjectLinked && form.engagementType === "investor" && (
              <>
                <div>
                  <Label>Investor Profile</Label>
                  <select
                    value={form.investorType}
                    onChange={(e) => update({ investorType: e.target.value })}
                    className={cn(inputClass, "appearance-none")}
                    style={selectStyle(!!form.investorType)}
                  >
                    <option value="" disabled>Select type</option>
                    {investorTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <SectorMultiSelect selected={form.sectorIds} onToggle={toggleSector} />
                <div>
                  <Label>Indicative Ticket Size</Label>
                  <div className="flex flex-wrap gap-2">
                    {ticketSizeRanges.map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => update({ ticketSizeRange: range })}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: form.ticketSizeRange === range ? "var(--color-gold)" : EMPTY_BG,
                          color: form.ticketSizeRange === range ? "#000" : "var(--color-text-secondary)",
                          border: form.ticketSizeRange === range ? "none" : BORDER,
                        }}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!isProjectLinked && form.engagementType === "government_dfi" && (
              <>
                <div>
                  <Label>Ministry or Institution Represented</Label>
                  <input
                    value={form.ministryRepresented}
                    onChange={(e) => update({ ministryRepresented: e.target.value })}
                    placeholder="e.g. Ministry of Finance, Economic Development and Investment Promotion"
                    className={inputClass}
                    style={fieldStyle(!!form.ministryRepresented)}
                  />
                </div>
                <div>
                  <Label>Nature of Engagement</Label>
                  <div className="flex flex-wrap gap-2">
                    {natureOfEngagementOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => update({ natureOfEngagement: opt })}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: form.natureOfEngagement === opt ? "var(--color-gold)" : EMPTY_BG,
                          color: form.natureOfEngagement === opt ? "#000" : "var(--color-text-secondary)",
                          border: form.natureOfEngagement === opt ? "none" : BORDER,
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!isProjectLinked && form.engagementType === "strategic_partner" && (
              <>
                <div>
                  <Label>Partnership Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {partnershipTypeOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => update({ partnershipType: opt })}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: form.partnershipType === opt ? "var(--color-gold)" : EMPTY_BG,
                          color: form.partnershipType === opt ? "#000" : "var(--color-text-secondary)",
                          border: form.partnershipType === opt ? "none" : BORDER,
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <SectorMultiSelect selected={form.sectorIds} onToggle={toggleSector} />
              </>
            )}

            {isProjectLinked && project && (
              <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                <p className="mb-3">
                  This inquiry is anchored to a specific project, so sector and ticket-size fields are
                  pre-scoped — proceed to confirm your objective.
                </p>
                <div
                  className="p-4 rounded"
                  style={{ backgroundColor: EMPTY_BG, border: BORDER }}
                >
                  <p className="text-xs font-mono tracking-widest uppercase mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Project
                  </p>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {project.title}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <Label>Investment / Partnership Objective</Label>
              <textarea
                rows={4}
                value={form.objective}
                onChange={(e) => update({ objective: e.target.value })}
                placeholder="Describe your investment thesis, mandate, or engagement objective"
                className={cn(inputClass, "resize-none")}
                style={fieldStyle(!!form.objective)}
              />
            </div>

            <div className="pt-4 border-t" style={{ borderColor: "var(--color-sovereign-border)" }}>
              <p className="text-xs font-mono tracking-widest uppercase mb-3" style={{ color: "var(--color-text-muted)" }}>
                Review
              </p>
              <dl className="space-y-2 text-sm">
                <SummaryRow label="Name" value={`${form.firstName} ${form.lastName}`} />
                <SummaryRow label="Organization" value={form.organization} />
                <SummaryRow label="Email" value={form.email} />
                <SummaryRow
                  label="Engagement Type"
                  value={ENGAGEMENT_OPTIONS.find((o) => o.id === form.engagementType)?.label ?? "—"}
                />
                {isProjectLinked && project && ask && (
                  <SummaryRow label="Regarding Project" value={`${project.title} (${ASK_META[ask].label})`} />
                )}
                {!isProjectLinked && form.engagementType === "investor" && (
                  <>
                    <SummaryRow label="Investor Profile" value={form.investorType} />
                    <SummaryRow
                      label="Sector(s) of Interest"
                      value={form.sectorIds.map((id) => sectors.find((s) => s.id === id)?.name).filter(Boolean).join(", ") || "—"}
                    />
                    <SummaryRow label="Ticket Size" value={form.ticketSizeRange} />
                  </>
                )}
                {!isProjectLinked && form.engagementType === "government_dfi" && (
                  <>
                    <SummaryRow label="Ministry / Institution" value={form.ministryRepresented} />
                    <SummaryRow label="Nature of Engagement" value={form.natureOfEngagement} />
                  </>
                )}
                {!isProjectLinked && form.engagementType === "strategic_partner" && (
                  <>
                    <SummaryRow label="Partnership Type" value={form.partnershipType} />
                    <SummaryRow
                      label="Sector(s) of Interest"
                      value={form.sectorIds.map((id) => sectors.find((s) => s.id === id)?.name).filter(Boolean).join(", ") || "—"}
                    />
                  </>
                )}
              </dl>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-8 pt-6 border-t" style={{ borderColor: "var(--color-sovereign-border)" }}>
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="inline-flex items-center gap-2 text-sm transition-colors disabled:opacity-0"
            style={{ color: "var(--color-text-muted)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              disabled={!canAdvance}
              onClick={() => setStep((s) => Math.min(3, s + 1))}
              className="btn-sovereign disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!canAdvance}
              onClick={handleSubmit}
              className="btn-sovereign disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit Inquiry <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt style={{ color: "var(--color-text-muted)" }}>{label}</dt>
      <dd className="text-right font-medium" style={{ color: "var(--color-text-primary)" }}>{value}</dd>
    </div>
  );
}

function SectorMultiSelect({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div>
      <Label>Sector(s) of Interest</Label>
      <div className="flex flex-wrap gap-2">
        {sectors.map((sector) => {
          const active = selected.includes(sector.id);
          return (
            <button
              key={sector.id}
              type="button"
              onClick={() => onToggle(sector.id)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: active ? "var(--color-gold)" : EMPTY_BG,
                color: active ? "#000" : "var(--color-text-secondary)",
                border: active ? "none" : BORDER,
              }}
            >
              {sector.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
