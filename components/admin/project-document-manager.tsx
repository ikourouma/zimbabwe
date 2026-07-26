"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import type { ProjectDocumentRecord, VisibilityLevel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** A file picked before the project row exists yet (create mode) — flushed to a real upload the
 *  moment ProjectForm's save call resolves with the new project id. */
export interface StagedProjectDocument {
  file: File;
  visibilityLevel: VisibilityLevel;
}

const VISIBILITY_LABELS: Record<VisibilityLevel, string> = {
  public: "Public",
  registered: "Registered",
  qualified_investor: "Qualified Investor",
  admin_only: "Admin Only",
};

interface ProjectDocumentManagerProps {
  /** Undefined until the project is actually created (create mode, pre-save). */
  projectId?: string;
  documents: ProjectDocumentRecord[];
  onDocumentsChange: (docs: ProjectDocumentRecord[]) => void;
  staged: StagedProjectDocument[];
  onStagedChange: (docs: StagedProjectDocument[]) => void;
}

/** Real R2-backed project artifact upload/list/remove widget — shared by the create and edit
 *  flows of ProjectForm. Replaces the old comma-separated "Document Placeholders" text field. */
export function ProjectDocumentManager({
  projectId,
  documents,
  onDocumentsChange,
  staged,
  onStagedChange,
}: ProjectDocumentManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<VisibilityLevel>("qualified_investor");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    if (!projectId) {
      onStagedChange([...staged, ...list.map((file) => ({ file, visibilityLevel: pendingVisibility }))]);
      return;
    }
    setUploading(true);
    try {
      for (const file of list) {
        const created = await uploadProjectDocument(projectId, file, pendingVisibility);
        onDocumentsChange([...documents, created]);
      }
      toast.success(list.length > 1 ? `${list.length} documents uploaded` : "Document uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload the document");
    } finally {
      setUploading(false);
    }
  };

  const removeStaged = (index: number) => onStagedChange(staged.filter((_, i) => i !== index));

  const removeUploaded = async (docId: string) => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDocumentsChange(documents.filter((d) => d.id !== docId));
      toast.success("Document removed");
    } catch {
      toast.error("Could not remove the document");
    }
  };

  const hasAny = documents.length > 0 || staged.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-52">
          <Label className="text-xs">Visibility for next upload</Label>
          <Select value={pendingVisibility} onValueChange={(v) => setPendingVisibility(v as VisibilityLevel)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="registered">Registered</SelectItem>
              <SelectItem value="qualified_investor">Qualified Investor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button type="button" size="sm" variant="secondary" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : "Add document"}
        </Button>
      </div>

      {hasAny ? (
        <ul className="divide-y rounded-md border">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="inline-flex min-w-0 items-center gap-2 truncate">
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{d.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">· {VISIBILITY_LABELS[d.visibilityLevel]}</span>
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={`/api/projects/${projectId}/documents/${d.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => removeUploaded(d.id)}
                  className="rounded p-1 text-muted-foreground hover:text-red-600"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
          {staged.map((s, i) => (
            <li key={`staged-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="inline-flex min-w-0 items-center gap-2 truncate">
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{s.file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  · {VISIBILITY_LABELS[s.visibilityLevel]} · uploads after save
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeStaged(i)}
                className="rounded p-1 text-muted-foreground hover:text-red-600"
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
      )}
    </div>
  );
}

/** Uploads one file to the real project-documents endpoint — used both by the widget's own file
 *  picker and by ProjectForm's post-create staged-file flush. */
export async function uploadProjectDocument(
  projectId: string,
  file: File,
  visibilityLevel: VisibilityLevel
): Promise<ProjectDocumentRecord> {
  const form = new FormData();
  form.append("file", file);
  form.append("visibilityLevel", visibilityLevel);
  const res = await fetch(`/api/projects/${projectId}/documents`, { method: "POST", body: form });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Upload failed");
  }
  return (await res.json()) as ProjectDocumentRecord;
}
