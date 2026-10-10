const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"];

// Accepts a YouTube URL (or a bare 11-char ID). Returns the video ID or null.
export function extractVideoId(input) {
  const text = input.trim();
  if (ID_PATTERN.test(text)) return text;

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }

  let candidate = null;
  if (url.hostname === "youtu.be") {
    candidate = url.pathname.slice(1).split("/")[0];          // youtu.be/ID
  } else if (YOUTUBE_HOSTS.includes(url.hostname)) {
    if (url.pathname === "/watch") {
      candidate = url.searchParams.get("v");                  // /watch?v=ID
    } else {
      const [, kind, id] = url.pathname.split("/");           // /embed/ID, /shorts/ID, /live/ID
      if (["embed", "shorts", "live"].includes(kind)) candidate = id;
    }
  }
  return candidate && ID_PATTERN.test(candidate) ? candidate : null;
}