"use client";

import { useEffect, useState } from "react";

interface UseJsonDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const cache = new Map<string, unknown>();

interface Loaded {
  path: string;
  data: unknown;
  error: string | null;
}

/** Fetch a JSON file once per path (module-level cache). `null` path = idle. */
export function useJsonData<T>(path: string | null): UseJsonDataResult<T> {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!path || cache.has(path)) return;
    let cancelled = false;

    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((json) => {
        cache.set(path, json);
        if (!cancelled) setLoaded({ path, data: json, error: null });
      })
      .catch((err) => {
        if (!cancelled) setLoaded({ path, data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!path) return { data: null, loading: false, error: null };
  if (cache.has(path)) return { data: cache.get(path) as T, loading: false, error: null };
  if (loaded?.path === path) return { data: loaded.data as T | null, loading: false, error: loaded.error };
  return { data: null, loading: true, error: null };
}
