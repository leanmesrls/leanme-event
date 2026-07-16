"use client";

import { useEffect, useRef } from "react";

export interface EntityRevisionWatchInfo {
  revision: number;
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Polls the entity GET endpoint while the tab is visible.
 * Calls onRemoteNewer when server revision is ahead of localRevision.
 */
export function useEntityRevisionWatch(options: {
  enabled: boolean;
  fetchUrl: string;
  localRevision: number;
  intervalMs?: number;
  extract: (payload: unknown) => EntityRevisionWatchInfo | null;
  onRemoteNewer: (info: EntityRevisionWatchInfo) => void;
}) {
  const {
    enabled,
    fetchUrl,
    localRevision,
    intervalMs = 20_000,
    extract,
    onRemoteNewer,
  } = options;
  const onRemoteNewerRef = useRef(onRemoteNewer);
  const extractRef = useRef(extract);
  onRemoteNewerRef.current = onRemoteNewer;
  extractRef.current = extract;

  useEffect(() => {
    if (!enabled || !fetchUrl) {
      return;
    }

    let cancelled = false;

    async function check() {
      if (document.visibilityState === "hidden") {
        return;
      }
      try {
        const response = await fetch(fetchUrl, { credentials: "same-origin" });
        if (!response.ok || cancelled) {
          return;
        }
        const payload: unknown = await response.json();
        const info = extractRef.current(payload);
        if (!info || cancelled) {
          return;
        }
        if (info.revision > localRevision) {
          onRemoteNewerRef.current(info);
        }
      } catch {
        /* ignore transient network errors */
      }
    }

    void check();
    const timer = window.setInterval(() => {
      void check();
    }, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void check();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, fetchUrl, localRevision, intervalMs]);
}
