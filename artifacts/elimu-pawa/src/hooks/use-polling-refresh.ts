"use client";

import { useEffect, useRef } from "react";

/**
 * Periodic refresh when realtime is unavailable. When `jitterMs` > 0, uses a
 * chained timer so poll times spread across clients (reduces synchronized GET bursts).
 */
export function usePollingRefresh(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled = true,
  jitterMs = 0,
) {
  const latestCallback = useRef(callback);

  useEffect(() => {
    latestCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let timeoutId: number;

    const schedule = () => {
      const delay =
        intervalMs + (jitterMs > 0 ? Math.floor(Math.random() * jitterMs) : 0);
      timeoutId = window.setTimeout(() => {
        void Promise.resolve(latestCallback.current()).finally(() => {
          schedule();
        });
      }, delay);
    };

    schedule();

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [enabled, intervalMs, jitterMs]);
}
