export interface UnsplashPhoto {
  url: string;
  alt: string;
  photographerName: string;
  photographerUrl: string;
  photoUrl: string;
}

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
const UTM = "utm_source=ekoguard&utm_medium=referral";

const cache = new Map<string, UnsplashPhoto>();

/**
 * Fetches one random photo for a query. Returns null (never throws) when no
 * VITE_UNSPLASH_ACCESS_KEY is configured or the request fails - callers
 * should fall back to a designed CSS placeholder, never a broken <img>.
 */
export async function fetchUnsplashPhoto(query: string): Promise<UnsplashPhoto | null> {
  if (!ACCESS_KEY) return null;
  if (cache.has(query)) return cache.get(query)!;

  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${ACCESS_KEY}` } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const photo: UnsplashPhoto = {
      url: data.urls.regular,
      alt: data.alt_description ?? query,
      photographerName: data.user.name,
      photographerUrl: `${data.user.links.html}?${UTM}`,
      photoUrl: `${data.links.html}?${UTM}`,
    };
    cache.set(query, photo);
    return photo;
  } catch {
    return null;
  }
}
