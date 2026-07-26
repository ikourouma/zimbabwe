"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, HelpCircle, Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { enMessages } from "@/lib/i18n/messages/en";
import type { FaqEntry, HomeHeroContent, HomeHeroSlide } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DEFAULT_HERO_SLIDES: HomeHeroSlide[] = enMessages.gatewaySlides.map((s) => ({ ...s }));

interface FaqFormState {
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
}

function emptyFaqForm(category?: string): FaqFormState {
  return { category: category ?? "", question: "", answer: "", sortOrder: 0 };
}

function fromFaqEntry(e: FaqEntry): FaqFormState {
  return { category: e.category, question: e.question, answer: e.answer, sortOrder: e.sortOrder };
}

/** FAQ list/add/edit/archive manager — same CRUD shape as taxonomies (Fortune-100 Gap-Closure
 *  Round 2/3, Phase 1 marketing CMS). Feeds the public /faq page via GET /api/faq. */
function FaqManager() {
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<FaqEntry | null>(null);
  const [form, setForm] = useState<FaqFormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/faq?all=true");
      if (res.ok) setEntries(await res.json());
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const categories = Array.from(new Set(entries.map((e) => e.category)));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyFaqForm(categories[0]));
  };
  const openEdit = (e: FaqEntry) => {
    setEditing(e);
    setForm(fromFaqEntry(e));
  };
  const close = () => {
    setForm(null);
    setEditing(null);
  };

  const save = async () => {
    if (!form) return;
    if (!form.category.trim() || !form.question.trim() || !form.answer.trim()) {
      toast.error("Category, question, and answer are all required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/faq/${editing.id}` : "/api/faq", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? "FAQ entry updated" : "FAQ entry added");
      close();
      await load();
    } catch {
      toast.error("Could not save this FAQ entry.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (e: FaqEntry) => {
    try {
      const res = await fetch(`/api/faq/${e.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: e.status === "active" ? "archived" : "active" }),
      });
      if (!res.ok) throw new Error();
      toast.success(e.status === "active" ? "Archived" : "Restored");
      await load();
    } catch {
      toast.error("Could not update this entry.");
    }
  };

  const remove = async (e: FaqEntry) => {
    try {
      const res = await fetch(`/api/faq/${e.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("FAQ entry deleted");
      await load();
    } catch {
      toast.error("Could not delete this entry.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {entries.length} entries · feeds the public <code>/faq</code> page. Archived entries stay editable here but
          are hidden from visitors.
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add entry
        </Button>
      </div>

      {isLoading ? (
        <div className="dashboard-skeleton h-4 w-full" />
      ) : entries.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: "var(--color-text-muted)" }}>
          No FAQ entries yet — the public page shows its built-in defaults until you add some.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Question</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className={e.status !== "active" ? "opacity-60" : ""}>
                  <td className="text-xs" style={{ color: "var(--color-text-muted)" }}>{e.category}</td>
                  <td className="text-white max-w-[280px] truncate" title={e.question}>{e.question}</td>
                  <td className="text-xs capitalize">{e.status}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleStatus(e)}>
                        {e.status === "active" ? "Archive" : "Restore"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(e)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(form)} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit FAQ entry" : "New FAQ entry"}</DialogTitle>
            <DialogDescription>Shown on the public /faq page, grouped by category.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Category</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="dashboard-input"
                  placeholder="e.g. About the Platform"
                  list="faq-categories"
                />
                <datalist id="faq-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Question</label>
                <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className="dashboard-input" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Answer</label>
                <textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={4} className="dashboard-input" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Sort order</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
                  className="dashboard-input max-w-[120px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={close} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Minimal textarea editor for the About page's intro copy (Phase 1 — plain paragraphs, no
 *  WYSIWYG). Falls back to the page's hardcoded intro when this block is empty. */
function AboutPageEditor() {
  const [intro, setIntro] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/content-blocks/about-page");
        if (res.ok) {
          const data = await res.json();
          setIntro((data.body?.intro as string) ?? "");
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/content-blocks/about-page", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: { intro } }),
      });
      if (!res.ok) throw new Error();
      toast.success("About page intro updated");
    } catch {
      toast.error("Could not save the About page content.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        Overrides the intro blockquote on <code>/about-afronovation</code>. Leave blank to show the built-in default.
      </p>
      {isLoading ? (
        <div className="dashboard-skeleton h-20 w-full" />
      ) : (
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          rows={4}
          className="dashboard-input"
          placeholder="Afronovation is the platform owner, operator, and technology partner for…"
        />
      )}
      <Button size="sm" onClick={save} disabled={saving || isLoading}>
        {saving ? "Saving…" : "Save About page intro"}
      </Button>
    </div>
  );
}

/** Structured editor for the 3 home hero slides (Phase 1 — fixed slide set matching the existing
 *  carousel's layout logic; add/remove slides is out of scope this round). Falls back to the
 *  i18n English default when no override exists. */
function HomeHeroEditor() {
  const [slides, setSlides] = useState<HomeHeroSlide[]>(DEFAULT_HERO_SLIDES);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasOverride, setHasOverride] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/content-blocks/home-hero");
        if (res.ok) {
          const data = await res.json();
          const body = data.body as HomeHeroContent | undefined;
          if (body?.slides?.length) {
            setSlides(body.slides);
            setHasOverride(true);
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const updateSlide = (index: number, patch: Partial<HomeHeroSlide>) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/content-blocks/home-hero", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: { slides } satisfies HomeHeroContent }),
      });
      if (!res.ok) throw new Error();
      setHasOverride(true);
      toast.success("Home hero content updated");
    } catch {
      toast.error("Could not save the home hero content.");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    setSlides(DEFAULT_HERO_SLIDES);
    toast.info("Reset to the built-in default — click Save to publish this.");
  };

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        Overrides the homepage hero carousel copy (English only in Phase 1 — French continues showing its translated
        default until this is extended). {hasOverride ? "Currently showing a saved override." : "Currently showing the built-in default."}
      </p>
      {isLoading ? (
        <div className="dashboard-skeleton h-40 w-full" />
      ) : (
        <div className="space-y-4">
          {slides.map((slide, i) => (
            <div key={slide.id} className="rounded-md p-3" style={{ border: "1px solid var(--color-sovereign-border)" }}>
              <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: "var(--color-gold)" }}>
                Slide {i + 1} · {slide.id}
              </p>
              <div className="space-y-2">
                <input
                  value={slide.overline}
                  onChange={(e) => updateSlide(i, { overline: e.target.value })}
                  className="dashboard-input text-xs"
                  placeholder="Overline"
                />
                <input
                  value={slide.headline}
                  onChange={(e) => updateSlide(i, { headline: e.target.value })}
                  className="dashboard-input"
                  placeholder="Headline"
                />
                <textarea
                  value={slide.description}
                  onChange={(e) => updateSlide(i, { description: e.target.value })}
                  rows={2}
                  className="dashboard-input text-sm"
                  placeholder="Description"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={slide.primaryCta.label}
                    onChange={(e) => updateSlide(i, { primaryCta: { ...slide.primaryCta, label: e.target.value } })}
                    className="dashboard-input text-xs"
                    placeholder="Primary CTA label"
                  />
                  <input
                    value={slide.primaryCta.href}
                    onChange={(e) => updateSlide(i, { primaryCta: { ...slide.primaryCta, href: e.target.value } })}
                    className="dashboard-input text-xs"
                    placeholder="Primary CTA link"
                  />
                  <input
                    value={slide.secondaryCta.label}
                    onChange={(e) => updateSlide(i, { secondaryCta: { ...slide.secondaryCta, label: e.target.value } })}
                    className="dashboard-input text-xs"
                    placeholder="Secondary CTA label"
                  />
                  <input
                    value={slide.secondaryCta.href}
                    onChange={(e) => updateSlide(i, { secondaryCta: { ...slide.secondaryCta, href: e.target.value } })}
                    className="dashboard-input text-xs"
                    placeholder="Secondary CTA link"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={saving || isLoading}>
          {saving ? "Saving…" : "Save home hero content"}
        </Button>
        <Button size="sm" variant="outline" onClick={resetToDefault} disabled={isLoading}>
          Reset to built-in default
        </Button>
      </div>
    </div>
  );
}

/** Super Admin → Settings "Page Content (Phase 1)" section — the highest-traffic marketing
 *  content only (home hero, About intro, FAQ). Sector descriptions are edited on the Taxonomies →
 *  Sectors tab instead (the field already lives on that table). Opportunity, Platform, Investor
 *  Journey, Legal, Zimbabwe Profile, and Glossary are explicitly deferred to a future CMS phase. */
export function MarketingCmsManager() {
  return (
    <section className="dashboard-panel p-5 space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-white mb-1">Page Content (Phase 1)</h2>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Highest-traffic marketing content only. Sector descriptions are managed on the{" "}
          <a href="/super-admin/taxonomies" className="underline" style={{ color: "var(--color-gold)" }}>
            Taxonomies → Sectors
          </a>{" "}
          tab. Opportunity, Platform, Investor Journey, Legal, Zimbabwe Profile, and Glossary pages are planned for a
          future CMS phase.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" style={{ color: "var(--color-gold)" }} /> Home Hero Carousel
        </h3>
        <HomeHeroEditor />
      </div>

      <div className="pt-4 border-t" style={{ borderColor: "var(--color-sovereign-border)" }}>
        <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" style={{ color: "var(--color-gold)" }} /> About Page Intro
        </h3>
        <AboutPageEditor />
      </div>

      <div className="pt-4 border-t" style={{ borderColor: "var(--color-sovereign-border)" }}>
        <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5" style={{ color: "var(--color-gold)" }} /> FAQ
        </h3>
        <FaqManager />
      </div>
    </section>
  );
}
