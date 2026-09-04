"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileArchive, FileCheck, FileText, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { AccessGate } from "@/components/dashboard/access-gate";

interface VaultPayload {
  nda: { acceptedAt: string; version: string | null; ip: string | null } | null;
  businessRegistration: boolean;
  accreditation: { id: string; kind: string; fileName: string; status: string; createdAt: string }[];
  mous: { id: string; engagementId: string; status: string; hasSnapshot: boolean; updatedAt: string }[];
  downloads: { id: string; entityId: string; createdAt: string }[];
}

const KIND_LABELS: Record<string, string> = {
  commitment_letter: "Commitment Letter",
  investment_guarantee: "Investment Guarantee Letter",
};

export default function DocumentVaultPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [data, setData] = useState<VaultPayload | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/vault")
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <div className="dashboard-skeleton h-8 w-48 mb-2" />
          <div className="dashboard-skeleton h-4 w-96" />
        </div>
        <div className="dashboard-panel p-8">
          <div className="dashboard-skeleton h-4 w-full mb-3" />
          <div className="dashboard-skeleton h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AccessGate title="Sign in required" description="Sign in to open your personal document vault." />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Document Vault</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Your NDA certificate, accreditation uploads, MOU snapshots, and recent document downloads in one place.
        </p>
      </div>

      {!data ? (
        <div className="dashboard-panel p-8 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Loading vault…
        </div>
      ) : (
        <div className="space-y-4">
          <section className="dashboard-panel p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> NDA certificate
            </h2>
            {data.nda ? (
              <div className="text-sm space-y-1" style={{ color: "var(--color-text-secondary)" }}>
                <p>Accepted {new Date(data.nda.acceptedAt).toLocaleString()}</p>
                {data.nda.version ? <p>Agreement version {data.nda.version}</p> : null}
                {data.nda.ip ? <p>Recorded from IP {data.nda.ip}</p> : null}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                No NDA acceptance on file yet.
              </p>
            )}
          </section>

          <section className="dashboard-panel p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FileCheck className="h-4 w-4" /> Company & accreditation
            </h2>
            <p className="text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
              Business registration: {data.businessRegistration ? "On file" : "Not uploaded"}
            </p>
            <AccreditationUpload onUploaded={() => fetch("/api/vault").then((res) => res.ok && res.json()).then((next) => next && setData(next))} />
            {data.accreditation.length === 0 ? (
              <p className="text-sm mt-2" style={{ color: "var(--color-text-muted)" }}>
                No accreditation documents uploaded.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.accreditation.map((doc) => (
                  <li key={doc.id}>
                    <a href={`/api/accreditation/${doc.id}/download`} className="underline" style={{ color: "var(--color-gold)" }}>
                      {KIND_LABELS[doc.kind] ?? doc.kind} — {doc.fileName}
                    </a>
                    <span className="ml-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {doc.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dashboard-panel p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" /> MOU snapshots
            </h2>
            {data.mous.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                No MOUs yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.mous.map((mou) => (
                  <li key={mou.id}>
                    <Link href="/deal-room/mou" className="underline" style={{ color: "var(--color-gold)" }}>
                      {mou.status}
                      {mou.hasSnapshot ? " — snapshot available" : ""}
                    </Link>
                    <span className="ml-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(mou.updatedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dashboard-panel p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FileArchive className="h-4 w-4" /> Recent document downloads
            </h2>
            {data.downloads.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                No downloads recorded yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {data.downloads.map((d) => (
                  <li key={d.id}>
                    Document {d.entityId.slice(0, 8)}… · {new Date(d.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function AccreditationUpload({ onUploaded }: { onUploaded: () => void }) {
  const upload = async (kind: "commitment_letter" | "investment_guarantee", file: File) => {
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    const res = await fetch("/api/accreditation", { method: "POST", body: form });
    if (res.ok) onUploaded();
    else {
      const body = await res.json().catch(() => ({}));
      toast.error((body as { error?: string }).error ?? "Upload failed. Please try again.");
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {(["commitment_letter", "investment_guarantee"] as const).map((kind) => (
        <label key={kind} className="text-xs px-3 py-1.5 rounded border cursor-pointer" style={{ borderColor: "var(--color-sovereign-border)", color: "var(--color-text-secondary)" }}>
          Upload {kind === "commitment_letter" ? "Commitment Letter" : "Guarantee Letter"}
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(kind, file);
              e.target.value = "";
            }}
          />
        </label>
      ))}
    </div>
  );
}
