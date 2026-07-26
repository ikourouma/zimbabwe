"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, ShieldCheck, Route, ArrowRight } from "lucide-react";
import { useLeadCapture } from "@/context/lead-capture-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/shared/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const trustPoints = [
  {
    icon: Clock,
    title: "Fast, direct response",
    desc: "Investment and partnership inquiries are typically acknowledged within one business day.",
  },
  {
    icon: Route,
    title: "Routed to the right desk",
    desc: "Your reason for contact determines who picks it up — no generic inbox queue.",
  },
  {
    icon: ShieldCheck,
    title: "Confidential by default",
    desc: "Inquiry details are shared only with the relevant Afronovation and ZIDA liaison team.",
  },
];

export function ContactPageContent() {
  const { addInquiry } = useLeadCapture();
  // Live, super-admin-editable list (Site Settings → Taxonomies → Contact Reasons) rather than the
  // static seed array, so a newly added reason (e.g. a routing category) shows up immediately
  // without a redeploy. Archived reasons are excluded — they still exist for historical inquiries
  // but shouldn't be pickable on new submissions.
  const { contactReasons } = useTaxonomyStore();
  const activeContactReasons = contactReasons.filter((cr) => cr.status === "active");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    contactReasonId: "",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.contactReasonId) {
      toast.error("Please fill in required fields");
      return;
    }
    addInquiry({
      type: "contact",
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      organization: form.organization,
      contactReasonId: form.contactReasonId,
      message: form.message,
    });
    setIsSubmitted(true);
    toast.success("Message sent successfully. Our team will follow up.");
    setForm({ name: "", email: "", phone: "", organization: "", contactReasonId: "", message: "" });
  };

  return (
    <div className="page-container py-12 md:py-16">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
        {/* Left: narrative / trust panel */}
        <div className="lg:pt-3">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-zim-green-700)" }}>
            Get in Touch
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zim-charcoal mb-4">
            Talk to the platform team
          </h1>
          <p className="text-base text-zim-muted leading-relaxed mb-10 max-w-md">
            Whether you&apos;re exploring an investment, proposing a partnership, or representing a
            government or DFI mandate — tell us why you&apos;re reaching out, and we&apos;ll route it
            to the right people.
          </p>

          <div className="space-y-6">
            {trustPoints.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zim-green-700/10">
                  <Icon className="h-4 w-4" style={{ color: "var(--color-zim-green-700)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zim-charcoal">{title}</p>
                  <p className="text-sm text-zim-muted mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: elevated form card */}
        <div className="relative rounded-2xl border border-zim-border bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
          <div
            className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
            style={{ background: "linear-gradient(90deg, var(--color-zim-gold), var(--color-zim-green-700))" }}
          />

          {isSubmitted ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zim-green-700/10 mb-5">
                <ShieldCheck className="h-7 w-7" style={{ color: "var(--color-zim-green-700)" }} />
              </div>
              <h2 className="text-xl font-semibold text-zim-charcoal mb-2">Message received</h2>
              <p className="text-sm text-zim-muted max-w-sm">
                Thank you for reaching out. Our team will follow up at the email — or phone number, if
                provided — you shared.
              </p>
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="mt-6 text-sm font-medium transition-colors hover:text-zim-charcoal"
                style={{ color: "var(--color-zim-green-700)" }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="reason">Reason for contact *</Label>
                <Select
                  value={form.contactReasonId}
                  onValueChange={(v) => setForm({ ...form, contactReasonId: v })}
                >
                  <SelectTrigger id="reason" className="mt-1.5">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeContactReasons.map((cr) => (
                      <SelectItem key={cr.id} value={cr.id}>{cr.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Full name *</Label>
                  <Input
                    id="name"
                    className="mt-1.5"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    className="mt-1.5"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="org">Organization</Label>
                  <Input
                    id="org"
                    className="mt-1.5"
                    value={form.organization}
                    onChange={(e) => setForm({ ...form, organization: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <PhoneInput
                    id="phone"
                    className="mt-1.5"
                    value={form.phone}
                    onChange={(phone) => setForm({ ...form, phone })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  rows={4}
                  className="mt-1.5"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-sovereign w-full justify-center">
                Send message <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-xs text-zim-muted text-center">
                We typically respond within one business day.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
