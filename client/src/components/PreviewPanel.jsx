import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from "@codesandbox/sandpack-react";

import { detectDependencies } from "../utils/sandpackUtils";
import { useAppContext } from "../context/AppContext";
import SandpackErrorMonitor from "./SandpackErrorMonitor";

// =========================================================
// SANDPACK WATCHER
// =========================================================

function SandpackWatcher() {
  const { sandpack } = useSandpack();

  const { files } = sandpack;

  const { activeProject, updateProjectFiles } = useAppContext();

  // Stores the last known files so we can detect real changes.
  const lastFilesRef = useRef(null);

  // Used to make sure we don't save Sandpack's initial hydration.
  const initializedProjectIdRef = useRef(null);

  // ---------------------------------------------------------
  // Normalize Sandpack files
  // ---------------------------------------------------------

  const normalizeFiles = useCallback((sourceFiles) => {
    const normalized = {};

    if (!sourceFiles || typeof sourceFiles !== "object") {
      return normalized;
    }

    Object.entries(sourceFiles).forEach(([path, file]) => {
      if (typeof file === "string") {
        normalized[path] = file;
      } else if (file && typeof file === "object") {
        normalized[path] = file.code ?? file.content ?? "";
      }
    });

    return normalized;
  }, []);

  // =========================================================
  // INITIALIZE PROJECT SNAPSHOT
  // =========================================================

  useEffect(() => {
    if (!activeProject?._id) {
      lastFilesRef.current = null;
      initializedProjectIdRef.current = null;
      return;
    }

    console.log(
      "📦 Initializing Sandpack watcher for project:",
      activeProject._id,
    );

    initializedProjectIdRef.current = activeProject._id;

    // Important:
    // Take the files coming from the backend as the initial snapshot.
    lastFilesRef.current = normalizeFiles(activeProject.files);
  }, [activeProject?._id, normalizeFiles]);

  // =========================================================
  // WATCH SANDPACK FILE CHANGES
  // =========================================================

  useEffect(() => {
    if (!activeProject?._id) {
      return;
    }

    if (!files || typeof files !== "object") {
      return;
    }

    const projectId = activeProject._id;

    const currentFiles = normalizeFiles(files);

    // -------------------------------------------------------
    // Make sure watcher belongs to current project
    // -------------------------------------------------------

    if (initializedProjectIdRef.current !== projectId) {
      initializedProjectIdRef.current = projectId;
      lastFilesRef.current = currentFiles;

      console.log("🟢 Sandpack initialized for project:", projectId);

      return;
    }

    // -------------------------------------------------------
    // First snapshot
    // -------------------------------------------------------

    if (!lastFilesRef.current) {
      lastFilesRef.current = currentFiles;

      console.log("🟢 Initial Sandpack files stored");

      return;
    }

    const previousFiles = lastFilesRef.current;

    let changed = false;

    // -------------------------------------------------------
    // Compare file count
    // -------------------------------------------------------

    const currentPaths = Object.keys(currentFiles);
    const previousPaths = Object.keys(previousFiles);

    if (currentPaths.length !== previousPaths.length) {
      changed = true;
    }

    // -------------------------------------------------------
    // Compare file contents
    // -------------------------------------------------------

    if (!changed) {
      for (const path of currentPaths) {
        if (currentFiles[path] !== previousFiles[path]) {
          console.log("✏️ FILE CHANGED:", path);

          changed = true;

          break;
        }
      }
    }

    // -------------------------------------------------------
    // Nothing changed
    // -------------------------------------------------------

    if (!changed) {
      return;
    }

    // -------------------------------------------------------
    // Update local snapshot BEFORE saving
    // -------------------------------------------------------

    lastFilesRef.current = currentFiles;

    console.log("💾 AUTO SAVE TRIGGERED");
    console.log("📁 Project:", projectId);
    console.log("📄 Files:", currentFiles);

    // -------------------------------------------------------
    // Send files to AppContext
    //
    // AppContext handles debounce + API request.
    // -------------------------------------------------------

    updateProjectFiles(currentFiles);
  }, [files, activeProject?._id, normalizeFiles, updateProjectFiles]);

  return null;
}

// =========================================================
// PREVIEW PANEL
// =========================================================

const PreviewPanel = ({ project, showCode }) => {
  const [showErrorOverlay, setShowErrorOverlay] = useState(true);

  // =========================================================
  // CONVERT PROJECT FILES TO SANDPACK FILES
  // =========================================================

  const getProjectFiles = useCallback((files = {}) => {
    const result = {};

    if (!files || typeof files !== "object") {
      return result;
    }

    Object.entries(files).forEach(([path, file]) => {
      if (typeof file === "string") {
        result[path] = file;
      } else if (file && typeof file === "object") {
        result[path] = file.content ?? file.code ?? "";
      }
    });

    return result;
  }, []);

  // =========================================================
  // INITIAL FILES
  // =========================================================

  const initialFiles = useMemo(() => {
    return getProjectFiles(project?.files);
  }, [project?.files, getProjectFiles]);

  // =========================================================
  // DEPENDENCIES
  // =========================================================

  const dependencies = useMemo(() => {
    return detectDependencies(initialFiles);
  }, [initialFiles]);

  // =========================================================
  // NO PROJECT
  // =========================================================

  if (!project) {
    return null;
  }

  return (
    <SandpackProvider
      key={project._id}
      template="react"
      files={initialFiles}
      customSetup={{
        dependencies,
      }}
      options={{
        externalResources: [
          "https://cdn.tailwindcss.com",
          "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
        ],

        classes: {
          "sp-wrapper": "sp-wrapper",
          "sp-layout": "sp-layout",
          "sp-preview": "sp-preview",
        },

        logLevel: 0,
      }}
      theme={{
        colors: {
          surface1: "#ffffff",
          surface2: "#f4f4f5",
          surface3: "#e4e4e7",
          clickable: "#71717a",
          base: "#09090b",
          disabled: "#a1a1aa",
          hover: "#18181b",
          accent: "#18181b",
          error: "#ef4444",
          errorSurface: "#fef2f2",
        },

        font: {
          body: "'Urbanist', system-ui, -apple-system, sans-serif",
          mono: "'Geist Mono', ui-monospace, monospace",
          size: "13px",
          lineHeight: "1.6",
        },
      }}
    >
      {/* Watches Sandpack editor changes */}
      <SandpackWatcher />

      {/* Watches runtime errors */}
      <SandpackErrorMonitor onErrorChange={setShowErrorOverlay} />

      {/* =====================================================
          MAIN SANDPACK LAYOUT
          ===================================================== */}

      <SandpackLayout
        style={{
          height: "100%",
          width: "100%",
          border: "none",
          borderRadius: 0,
          background: "transparent",
        }}
      >
        {/* =================================================
            CODE EDITOR
            ================================================= */}

        {showCode && (
          <SandpackCodeEditor
            showTabs
            showLineNumbers
            showInlineErrors
            wrapContent
            style={{
              height: "100%",
              flex: 1,
              minWidth: 0,
            }}
          />
        )}

        {/* =================================================
            PREVIEW
            ================================================= */}

        <SandpackPreview
          showNavigator={false}
          showRefreshButton
          showOpenInCodeSandbox={false}
          showSandpackErrorOverlay={showErrorOverlay}
          style={{
            height: "100%",
            flex: showCode ? 1 : 2,
            minWidth: 0,
          }}
        />
      </SandpackLayout>
    </SandpackProvider>
  );
};

export default PreviewPanel;
