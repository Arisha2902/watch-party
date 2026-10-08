// YouTube video IDs are always 11 characters: letters, digits, "-" and "_"
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

// Takes untrusted input, returns a clean ID or null
export function parseVideoId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return VIDEO_ID_PATTERN.test(id) ? id : null;
}