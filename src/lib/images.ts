export const BUCKET = "products";

export function resolveStorageUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return "/jersey-arsenal.jpg";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://") || pathOrUrl.startsWith("data:") || pathOrUrl.startsWith("/")) {
    return pathOrUrl;
  }
  // If stored as relative path or file name
  return `/${pathOrUrl}`;
}
