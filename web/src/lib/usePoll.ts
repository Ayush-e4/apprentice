"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "./api";

/** Calls `load` now and every `ms` milliseconds; keeps the last good data when a poll fails. */
export function usePoll<T>(load: () => Promise<T>, ms: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loader = useRef(load);
  loader.current = load;

  const refresh = useCallback(async () => {
    try {
      setData(await loader.current());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (ms <= 0) return;
    const id = setInterval(refresh, ms);
    return () => clearInterval(id);
  }, [refresh, ms]);

  return { data, error, loading, refresh };
}
