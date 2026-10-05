/**
 * Member photography comes from Unsplash (free licence). Stored as bare photo
 * ids so we can request the crop each surface needs.
 */
const UNSPLASH = "https://images.unsplash.com/photo-";

export function unsplash(id: string) {
  return `${UNSPLASH}${id}`;
}

/** Resize/crop a photo URL. Non-Unsplash URLs (uploads, LinkedIn) pass through. */
export function photo(url: string, width: number, height?: number) {
  if (!url.startsWith(UNSPLASH)) return url;
  const params = new URLSearchParams({
    w: String(width),
    q: "80",
    auto: "format",
    fit: "crop",
    crop: "faces",
  });
  if (height) params.set("h", String(height));
  return `${url}?${params.toString()}`;
}

export const SCENE_PHOTOS = {
  heroSelfie: unsplash("1758275557315-2685e63fa8d2"),
  volunteers: unsplash("1758599669406-d5179ccefcb9"),
  beachCleanup: unsplash("1758599669199-a858720a9689"),
  communityGarden: unsplash("1781785161788-a906202dba8f"),
};
