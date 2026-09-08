import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import api from "../api/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import debounce from "lodash.debounce";

const AppContext = createContext(undefined);

export function AppContextProvider({ children }) {
  const navigate = useNavigate();

  // =========================================================
  // AUTH STATE
  // =========================================================

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // =========================================================
  // PROJECT STATE
  // =========================================================

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [activeProject, setActiveProject] = useState(null);
  const [loadingActiveProject, setLoadingActiveProject] = useState(true);

  const [chatLoading, setChatLoading] = useState(false);
  const [generatingProject, setGeneratingProject] = useState(false);

  const [activeFile, setActiveFile] = useState("/App.js");
  const [showCode, setShowCode] = useState(false);

  // =========================================================
  // AUTO SAVE STATE
  // =========================================================

  const [savingFiles, setSavingFiles] = useState(false);

  // =========================================================
  // REFS
  // =========================================================

  const activeProjectRef = useRef(null);

  useEffect(() => {
    activeProjectRef.current = activeProject;
  }, [activeProject]);

  // =========================================================
  // AUTH
  // =========================================================

  const checkSession = useCallback(async () => {
    try {
      const { data } = await api.get("/api/auth/me");

      setUser(data.user);
    } catch (error) {
      console.error("Session check failed:", error);
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // =========================================================
  // LOGIN
  // =========================================================

  const login = useCallback(
    async (email, password) => {
      try {
        const { data } = await api.post("/api/auth/login", {
          email,
          password,
        });

        setUser(data.user);

        toast.success("Welcome Back!");

        navigate("/");
      } catch (err) {
        console.error("Login failed:", err);

        const errMsg =
          err?.response?.data?.error || "Invalid email or password";

        toast.error(errMsg);

        throw new Error(errMsg);
      }
    },
    [navigate],
  );

  // =========================================================
  // REGISTER
  // =========================================================

  const register = useCallback(
    async (name, email, password) => {
      try {
        const { data } = await api.post("/api/auth/register", {
          name,
          email,
          password,
        });

        setUser(data.user);

        toast.success("Account created successfully!");

        navigate("/");
      } catch (err) {
        console.error("Registration failed:", err);

        const errMsg = err?.response?.data?.error || "Registration failed";

        toast.error(errMsg);

        throw new Error(errMsg);
      }
    },
    [navigate],
  );

  // =========================================================
  // NORMALIZE FILES
  // =========================================================

  const normalizeFiles = useCallback((files) => {
    const normalized = {};

    if (!files || typeof files !== "object") {
      return normalized;
    }

    Object.entries(files).forEach(([path, file]) => {
      if (typeof file === "string") {
        normalized[path] = file;
      } else if (file && typeof file === "object") {
        normalized[path] = file.content ?? file.code ?? "";
      }
    });

    return normalized;
  }, []);

  // =========================================================
  // DEBOUNCED AUTO SAVE
  // =========================================================

  const debouncedSave = useMemo(() => {
    const save = debounce(async (files, projectId) => {
      if (!projectId) {
        console.warn("⚠️ Cannot auto-save: no project ID");
        return;
      }

      if (!files || typeof files !== "object") {
        console.warn("⚠️ Cannot auto-save: invalid files");
        return;
      }

      console.log("💾 AUTO SAVE START");
      console.log("Project:", projectId);
      console.log("Files:", files);

      setSavingFiles(true);

      try {
        const { data } = await api.put(`/api/projects/${projectId}/files`, {
          files,
        });

        console.log("✅ AUTO SAVE SUCCESS");
        console.log("📦 API response:", data);

        // Update local project state.
        setActiveProject((previousProject) => {
          if (!previousProject || previousProject._id !== projectId) {
            return previousProject;
          }

          return {
            ...previousProject,
            files,
            updatedAt: data?.updatedAt || new Date().toISOString(),
          };
        });
      } catch (error) {
        console.error("❌ AUTO SAVE FAILED:", error);
        console.error("Status:", error?.response?.status);
        console.error("Response:", error?.response?.data);
        console.error("Message:", error?.message);
      } finally {
        setSavingFiles(false);
      }
    }, 1000);

    return save;
  }, []);

  // =========================================================
  // LOGOUT
  // =========================================================

  const logout = useCallback(async () => {
    try {
      // Cancel any pending auto-save.
      debouncedSave.cancel();

      await api.post("/api/auth/logout");

      setUser(null);
      setProjects([]);
      setActiveProject(null);
      setActiveFile("/App.js");
      setSavingFiles(false);

      toast.success("Logged out successfully");

      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);

      toast.error("Logout failed");
    }
  }, [navigate, debouncedSave]);

  // =========================================================
  // LOAD PROJECTS
  // =========================================================

  const loadProjects = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const { data } = await api.get("/api/projects");

      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to list projects:", err);

      toast.error("Failed to load projects list");
    } finally {
      setLoadingProjects(false);
    }
  }, [user]);

  // =========================================================
  // LOAD SINGLE PROJECT
  // =========================================================

  const loadProject = useCallback(
    async (id, silent = false) => {
      if (!user || !id) {
        return;
      }

      if (!silent) {
        setLoadingActiveProject(true);
      }

      try {
        const { data } = await api.get(`/api/projects/${id}`);

        if (!data) {
          throw new Error("Project data is empty");
        }

        setActiveProject(data);

        const files = Object.keys(data.files || {});

        if (files.length > 0) {
          setActiveFile((previousFile) => {
            if (files.includes(previousFile)) {
              return previousFile;
            }

            if (files.includes("/App.js")) {
              return "/App.js";
            }

            return files[0];
          });
        }
      } catch (err) {
        console.error("Failed to load project:", err);

        if (!silent) {
          toast.error("Failed to load project details");

          navigate("/");
        }
      } finally {
        if (!silent) {
          setLoadingActiveProject(false);
        }
      }
    },
    [user, navigate],
  );

  // =========================================================
  // LOAD PROJECTS WHEN USER IS AVAILABLE
  // =========================================================

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setLoadingProjects(false);
      return;
    }

    setLoadingProjects(true);

    loadProjects();
  }, [user, loadProjects]);

  // =========================================================
  // PROJECT STATUS POLLING
  // =========================================================

  useEffect(() => {
    if (!activeProject?._id || !user) {
      return;
    }

    const isOngoing =
      activeProject.status === "generating" ||
      activeProject.status === "pending" ||
      activeProject.status === "revising";

    if (!isOngoing) {
      setChatLoading(false);
      return;
    }

    setChatLoading(true);

    const interval = setInterval(() => {
      loadProject(activeProject._id, true);
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [activeProject?._id, activeProject?.status, user, loadProject]);

  // =========================================================
  // GENERATE PROJECT
  // =========================================================

  const handleGenerate = useCallback(
    async (prompt) => {
      if (!user || !prompt?.trim()) {
        return;
      }

      setGeneratingProject(true);

      try {
        const { data } = await api.post("/api/projects", {
          prompt: prompt.trim(),
        });

        toast.success("AI Agent is planning structure...");

        navigate(`/builder/${data._id}`);
      } catch (err) {
        console.error("Failed to generate project:", err);

        toast.error(err?.response?.data?.error || "Failed to generate project");
      } finally {
        setGeneratingProject(false);
      }
    },
    [navigate, user],
  );

  // =========================================================
  // DELETE PROJECT
  // =========================================================

  const handleDelete = useCallback(
    async (id) => {
      if (!user || !id) {
        return;
      }

      try {
        await api.delete(`/api/projects/${id}`);

        setProjects((previous) =>
          previous.filter((project) => project._id !== id),
        );

        if (activeProject?._id === id) {
          setActiveProject(null);
        }

        toast.success("Project deleted successfully");
      } catch (err) {
        console.error("Failed to delete project:", err);

        toast.error("Failed to delete project");
      }
    },
    [user, activeProject?._id],
  );

  // =========================================================
  // CHAT / REVISION
  // =========================================================

  const handleChat = useCallback(
    async (prompt) => {
      if (!activeProject?._id || !user || !prompt?.trim()) {
        return;
      }

      setChatLoading(true);

      try {
        const { data } = await api.post(
          `/api/projects/${activeProject._id}/chat`,
          {
            prompt: prompt.trim(),
          },
        );

        setActiveProject(data);

        if (data.errors && data.errors.length > 0) {
          toast.error(`${data.errors.length} revision patch(es) failed`);
        } else {
          toast.success(`Updated to version ${data.version}`);
        }
      } catch (err) {
        console.error("Revision request failed:", err);

        toast.error(err?.response?.data?.error || "Revision request failed");
      } finally {
        setChatLoading(false);
      }
    },
    [activeProject?._id, user],
  );

  // =========================================================
  // UPDATE PROJECT FILES
  // =========================================================

  const updateProjectFiles = useCallback(
    (files) => {
      const projectId = activeProjectRef.current?._id;

      if (!projectId) {
        console.warn("⚠️ No active project for file update");
        return;
      }

      if (!files || typeof files !== "object") {
        console.warn("⚠️ Invalid files received");
        return;
      }

      const normalizedFiles = normalizeFiles(files);

      console.log("🚨 updateProjectFiles called");

      console.log("📁 Files:", normalizedFiles);

      // Update local state immediately.
      setActiveProject((previousProject) => {
        if (!previousProject || previousProject._id !== projectId) {
          return previousProject;
        }

        return {
          ...previousProject,
          files: normalizedFiles,
        };
      });

      // Save to backend after 1 second.
      debouncedSave(normalizedFiles, projectId);
    },
    [normalizeFiles, debouncedSave],
  );

  // =========================================================
  // CANCEL AUTO SAVE ON UNMOUNT
  // =========================================================

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // =========================================================
  // CONTEXT VALUE
  // =========================================================

  const contextValue = useMemo(
    () => ({
      user,
      loadingUser,

      login,
      register,
      logout,

      projects,
      loadingProjects,

      activeProject,
      loadingActiveProject,

      chatLoading,
      generatingProject,

      activeFile,
      showCode,

      savingFiles,

      setActiveFile,
      setShowCode,

      loadProject,
      loadProjects,

      handleGenerate,
      handleDelete,
      handleChat,

      updateProjectFiles,
    }),
    [
      user,
      loadingUser,

      login,
      register,
      logout,

      projects,
      loadingProjects,

      activeProject,
      loadingActiveProject,

      chatLoading,
      generatingProject,

      activeFile,
      showCode,

      savingFiles,

      loadProject,
      loadProjects,

      handleGenerate,
      handleDelete,
      handleChat,

      updateProjectFiles,
    ],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}

// =========================================================
// HOOK
// =========================================================

export function useAppContext() {
  const context = useContext(AppContext);

  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppContextProvider");
  }

  return context;
}
