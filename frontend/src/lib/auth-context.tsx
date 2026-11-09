"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { User, Project } from "./types";
import { api } from "./api";

interface AuthContextType {
  user: User | null;
  activeProject: Project | null;
  projects: Project[];
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  setActiveProject: (project: Project) => void;
  refreshProjects: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProjects = useCallback(async () => {
    try {
      const projs = await api.getProjects();
      setProjects(projs);
      if (projs.length > 0) {
        const savedId = typeof window !== "undefined" ? localStorage.getItem("jgitlab_active_project_id") : null;
        const savedRepo = typeof window !== "undefined" ? localStorage.getItem("jgitlab_active_repo") : null;

        let found = projs.find((p) => p.id === savedId);
        if (!found && savedRepo) {
          found = projs.find(
            (p) =>
              p.git_repo_url?.toLowerCase().includes(savedRepo.toLowerCase()) ||
              p.name.toLowerCase().includes(savedRepo.toLowerCase())
          );
        }
        if (!found) {
          // Prefer web-shop if available, otherwise first project
          found =
            projs.find((p) => p.git_repo_url?.toLowerCase().includes("web-shop")) ||
            projs[0];
        }
        setActiveProjectState(found);
        if (typeof window !== "undefined" && found) {
          localStorage.setItem("jgitlab_active_project_id", found.id);
          if (found.git_repo_url && !savedRepo) {
            try {
              const url = new URL(found.git_repo_url);
              const parts = url.pathname.replace(/^\/+|\.git$/g, "").split("/");
              if (parts.length >= 2) {
                const fullName = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
                localStorage.setItem("jgitlab_active_repo", fullName);
              }
            } catch {}
          }
        }
      } else {
        setActiveProjectState(null);
      }
    } catch (err) {
      console.error("Failed to load projects", err);
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const me = await api.getMe();
      setUser(me);
      return me;
    } catch {
      if (typeof window !== "undefined") {
        localStorage.removeItem("jgitlab_token");
      }
      setUser(null);
      return null;
    }
  }, []);

  const setActiveProject = (proj: Project) => {
    setActiveProjectState(proj);
    if (typeof window !== "undefined") {
      localStorage.setItem("jgitlab_active_project_id", proj.id);
      if (proj.git_repo_url) {
        try {
          const url = new URL(proj.git_repo_url);
          const parts = url.pathname.replace(/^\/+|\.git$/g, "").split("/");
          if (parts.length >= 2) {
            const fullName = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
            localStorage.setItem("jgitlab_active_repo", fullName);
          }
        } catch {}
      }
    }
  };

  useEffect(() => {
    async function initAuth() {
      const me = await refreshUser();
      if (me) {
        await refreshProjects();
      }
      setLoading(false);
    }
    initAuth();
  }, [refreshUser, refreshProjects]);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    if (typeof window !== "undefined") {
      localStorage.setItem("jgitlab_token", res.access_token);
    }
    setUser(res.user);
    await refreshProjects();
  };

  const register = async (email: string, pass: string, name?: string) => {
    const res = await api.register({ email, password: pass, full_name: name });
    if (typeof window !== "undefined") {
      localStorage.setItem("jgitlab_token", res.access_token);
    }
    setUser(res.user);
    await refreshProjects();
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    if (typeof window !== "undefined") {
      localStorage.removeItem("jgitlab_token");
    }
    setUser(null);
    setProjects([]);
    setActiveProjectState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeProject,
        projects,
        loading,
        login,
        register,
        logout,
        setActiveProject,
        refreshProjects,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
