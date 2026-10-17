'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project } from '../types';
import { apiRequest } from '../lib/api';

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project) => void;
  isLoading: boolean;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest<Project[]>('/projects');
      setProjects(data);

      const savedProjectId = localStorage.getItem('wbtb_active_project_id');
      const found = data.find((p) => p.id === savedProjectId);

      if (found) {
        setActiveProjectState(found);
      } else if (data.length > 0) {
        setActiveProjectState(data[0]);
        localStorage.setItem('wbtb_active_project_id', data[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const setActiveProject = (project: Project) => {
    setActiveProjectState(project);
    localStorage.setItem('wbtb_active_project_id', project.id);
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        setActiveProject,
        isLoading,
        refreshProjects: fetchProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within a ProjectProvider');
  return context;
}
