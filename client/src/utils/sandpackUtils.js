// src/utils/sandpackUtils.js

/**
 * Detect npm dependencies from source files.
 *
 * Supports:
 *   import axios from "axios";
 *   import { motion } from "framer-motion";
 *   import "react-hot-toast";
 *   export { Button } from "some-package";
 *   const axios = require("axios");
 *
 * Ignores:
 *   ./localFile
 *   ../components/Button
 *   /src/components/Button
 *   @/components/Button
 *
 * Returns:
 *   {
 *     axios: "latest",
 *     "framer-motion": "latest"
 *   }
 */
export function detectDependencies(files) {
  const dependencies = {};

  if (!files || typeof files !== "object") {
    return dependencies;
  }

  const importRegex =
    /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']|require\s*\(\s*["']([^"']+)["']\s*\)/g;

  const builtInPackages = new Set([
    "react",
    "react-dom",
  ]);

  for (const [, file] of Object.entries(files)) {
    const code =
      typeof file === "string"
        ? file
        : file?.content ?? file?.code ?? "";

    if (typeof code !== "string") {
      continue;
    }

    importRegex.lastIndex = 0;

    let match;

    while ((match = importRegex.exec(code)) !== null) {
      const rawImport = match[1] || match[2];

      if (!rawImport) {
        continue;
      }

      // Ignore local imports
      if (
        rawImport.startsWith("./") ||
        rawImport.startsWith("../") ||
        rawImport.startsWith("/") ||
        rawImport.startsWith("@/")
      ) {
        continue;
      }

      let packageName;

      // Scoped package
      if (rawImport.startsWith("@")) {
        const parts = rawImport.split("/");

        if (parts.length >= 2) {
          packageName = `${parts[0]}/${parts[1]}`;
        }
      } else {
        // Normal package
        packageName = rawImport.split("/")[0];
      }

      if (!packageName) {
        continue;
      }

      // React is already available in Sandpack
      if (builtInPackages.has(packageName)) {
        continue;
      }

      dependencies[packageName] = "latest";
    }
  }

  return dependencies;
}