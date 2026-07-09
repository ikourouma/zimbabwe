"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { InvestmentProject } from "@/lib/types";
import { zimbabweProjects as seedProjects } from "@/lib/data/zimbabwe-projects";

interface ProjectStoreContextValue {
  projects: InvestmentProject[];
  getProject: (id: string) => InvestmentProject | undefined;
  getProjectBySlug: (slug: string) => InvestmentProject | undefined;
  updateProject: (id: string, updates: Partial<InvestmentProject>) => void;
  addProject: (project: InvestmentProject) => void;
  resetProjects: () => void;
}

const ProjectStoreContext = createContext<ProjectStoreContextValue | null>(null);

const STORAGE_KEY = "zim-project-store";

export function ProjectStoreProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<InvestmentProject[]>(seedProjects);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) setProjects(JSON.parse(stored));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: InvestmentProject[]) => {
    setProjects(next);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  );

  const getProjectBySlug = useCallback(
    (slug: string) => projects.find((p) => p.slug === slug),
    [projects]
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<InvestmentProject>) => {
      persist(
        projects.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        )
      );
    },
    [projects, persist]
  );

  const addProject = useCallback(
    (project: InvestmentProject) => {
      persist([project, ...projects]);
    },
    [projects, persist]
  );

  const resetProjects = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setProjects(seedProjects);
  }, []);

  if (!hydrated) {
    return (
      <ProjectStoreContext.Provider
        value={{
          projects: seedProjects,
          getProject: (id) => seedProjects.find((p) => p.id === id),
          getProjectBySlug: (slug) => seedProjects.find((p) => p.slug === slug),
          updateProject: () => {},
          addProject: () => {},
          resetProjects: () => {},
        }}
      >
        {children}
      </ProjectStoreContext.Provider>
    );
  }

  return (
    <ProjectStoreContext.Provider
      value={{ projects, getProject, getProjectBySlug, updateProject, addProject, resetProjects }}
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
