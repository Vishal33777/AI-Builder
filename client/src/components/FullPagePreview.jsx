import React, { useMemo, useState } from "react";
import { detectDependencies } from "../utils/sandpackUtils";
import SandpackErrorMonitor from "./SandpackErrorMonitor";
import {
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";

const FullPagePreview = ({ files }) => {
  const [showErrorOverlay, setShowErrorOverlay] = useState(true);

  //convert livefiles to sandPack format
  const sandpackFiles = useMemo(() => {
    if (!files) return {};
    const spFiles = {};
    for (const [path, content] of Object.entries(files)) {
      spFiles[path] = { code: content };
    }
    return spFiles;
  }, [files]);

  const dependencies = useMemo(() => {
    if (!files) return {};
    return detectDependencies(files);
  }, [files]);

  return (
    <div className="h-screen w-screen bg-white overflow-hidden">
      <SandpackProvider
        template="react"
        files={sandpackFiles}
        customSetup={{
          dependencies,
        }}
        options={{
          externalResources: [
            "https://cdn.tailwindcss.com",
            "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
          ],
          logLevel: 0,
        }}
        className="h-full w-full"
      >
        {/* Watches runtime errors */}
        <SandpackErrorMonitor onErrorChange={setShowErrorOverlay} />

        {/* =====================================================
          MAIN SANDPACK LAYOUT
          ===================================================== */}

        <SandpackLayout className="h-full w-full border-none! bg-transparent!">
          {/* =================================================
            PREVIEW
            ================================================= */}

          <SandpackPreview
            showNavigator={false}
            showRefreshButton={false}
            showOpenInCodeSandbox={false}
            showSandpackErrorOverlay={showErrorOverlay}
            className="h-full w-full"
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
};

export default FullPagePreview;
