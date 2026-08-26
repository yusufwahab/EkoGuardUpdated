import { useEffect, useState } from "react";
import { fetchUnsplashPhoto, type UnsplashPhoto } from "../lib/unsplash";

interface Result {
  query: string;
  photo: UnsplashPhoto | null;
}

export function useUnsplashPhoto(query: string) {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchUnsplashPhoto(query).then((photo) => {
      if (!cancelled) setResult({ query, photo });
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  // Derived, not stored: a stale result for a previous query still counts as loading.
  const loading = result?.query !== query;
  return { photo: loading ? null : result!.photo, loading };
}
