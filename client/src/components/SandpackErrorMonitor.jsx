import React, { useEffect } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";

const SandpackErrorMonitor = ({ onErrorChange }) => {
  const { sandpack } = useSandpack();
  const { error } = sandpack;

  useEffect(() => {
    if (typeof onErrorChange !== "function") {
      return;
    }

    // No Sandpack error
    if (!error) {
      onErrorChange(true);
      return;
    }

    const message = error?.message || error?.toString?.() || "";

    const isNetworkError =
      message.includes("Failed to fetch") ||
      message.includes("col.csbops.io") ||
      message.includes("ERR_CONNECTION_TIMED_OUT") ||
      message.includes("ERR_CONNECTION_RESET") ||
      message.includes("ERR_NETWORK") ||
      message.includes("net::ERR");

    if (isNetworkError) {
      // Hide Sandpack's default error overlay for
      // network/infrastructure errors.
      onErrorChange(false);
      return;
    }

    // Keep normal code/build errors visible.
    onErrorChange(true);
  }, [error, onErrorChange]);

  return null;
};

export default SandpackErrorMonitor;
