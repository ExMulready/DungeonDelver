"use client";

import { useEffect } from "react";

/**
 * Registers the service worker.
 *
 * Production only — in development a worker caches the shell and then serves
 * stale routes after every edit, which looks exactly like a broken hot reload
 * and costs an hour to diagnose.
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[pwa] service worker registration failed:", err);
      });
    };

    /* Wait for load so registration never competes with the first paint. */
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
