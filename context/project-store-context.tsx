"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { InvestmentProject } from "@/lib/types";
import { zimbabweProjects as seedProjects } from "@/lib/data/zimbabwe-projects";

interface ProjectStoreContextValue {
  projects: InvestmentProject[];
  isLoading: boolean;
  getProject: (id: string) => InvestmentProject | undefined;
  getProjectBySlug: (slug: string) => InvestmentProject | undefined;
  updateProject: (id: string, updates: Partial<InvestmentProject>) => Promise<void>;
  addProject: (project: InvestmentProject) => Promise<InvestmentProject>;
  resetProjects: () => Promise<void>;
  refresh: () => Promise<void>;
}

const ProjectStoreContext = createContext<ProjectStoreContextValue | null>(null);

export function ProjectStoreProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<InvestmentProject[]>(seedProjects);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) setProjects(await res.json());
    } catch {
      /* keep seed fallback */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id || p.slug === id),
    [projects]
  );

  const getProjectBySlug = useCallback(
    (slug: string) => projects.find((p) => p.slug === slug),
    [projects]
  );

  const updateProject = useCallback(
    async (id: string, updates: Partial<InvestmentProject>) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, updatedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to update project");
      const updated = (await res.json()) as InvestmentProject;
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    },
    []
  );

  const addProject = useCallback(async (project: InvestmentProject) => {
    const { id: _id, ...payload } = project;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create project");
    const created = (await res.json()) as InvestmentProject;
    setProjects((prev) => [created, ...prev]);
    return created;
  }, []);

  const resetProjects = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return (
    <ProjectStoreContext.Provider
      value={{
        projects,
        isLoading,
        getProject,
        getProjectBySlug,
        updateProject,
        addProject,
        resetProjects,
        refresh,
      }}
    >
      {children}
    </ProjectStoreContext.Provider>
  );
}

export function useProjectStore() {
  const ctx = useContext(ProjectStoreContext);
  if (!ctx) throw new Error("useProjectStore must be used within ProjectStoreProvider");
  return ctx;
}
