import { Leaf } from "lucide-react";
import clsx from "clsx";
import { useUnsplashPhoto } from "../hooks/useUnsplashPhoto";
import { Skeleton } from "./ui/Skeleton";

interface UnsplashImageProps {
  query: string;
  className?: string;
}

/**
 * Contextual photography (recycling / clean cities / sustainability) with
 * required Unsplash attribution. Degrades to a designed gradient panel -
 * never a broken image - when VITE_UNSPLASH_ACCESS_KEY isn't configured.
 */
export function UnsplashImage({ query, className }: UnsplashImageProps) {
  const { photo, loading } = useUnsplashPhoto(query);

  if (loading) {
    return <Skeleton className={clsx("rounded-2xl", className)} />;
  }

  if (!photo) {
    return (
      <div
        className={clsx(
          "flex items-center justify-center rounded-2xl bg-linear-to-br from-eco-600 via-eco-700 to-ink-900",
          className
        )}
      >
        <Leaf className="h-10 w-10 text-eco-200/70" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={clsx("group relative overflow-hidden rounded-2xl", className)}>
      <img src={photo.url} alt={photo.alt} className="h-full w-full object-cover" loading="lazy" />
      <div className="absolute bottom-2 right-2 rounded-md bg-black/50 px-2 py-1 text-xs text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
        Photo by{" "}
        <a href={photo.photographerUrl} target="_blank" rel="noreferrer" className="underline">
          {photo.photographerName}
        </a>{" "}
        on{" "}
        <a
          href="https://unsplash.com?utm_source=ekoguard&utm_medium=referral"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Unsplash
        </a>
      </div>
    </div>
  );
}
