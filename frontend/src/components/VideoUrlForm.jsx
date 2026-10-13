import { useEffect, useRef, useState } from "react";
import { emitAck } from "../services/socket";
import { extractVideoId } from "../utils/youtube";

export default function VideoUrlForm() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const timerRef = useRef(null);

  // Clear the pending "hide success" timer if the form goes away
  useEffect(() => () => clearTimeout(timerRef.current), []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const videoId = extractVideoId(url);
    if (!videoId) return setError("That doesn't look like a valid YouTube link.");

    setBusy(true);
    try {
      const res = await emitAck("change_video", { videoId });
      if (res.ok) {
        setUrl("");
        setSuccess("Video changed ✓");
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setSuccess(""), 2500);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="video-form" onSubmit={handleSubmit}>
      <input value={url} onChange={(e) => setUrl(e.target.value)}
             placeholder="Paste a YouTube link…" />
      <button disabled={busy || !url.trim()}>{busy ? "Loading…" : "Change video"}</button>
      {error && <p className="error" role="alert">{error}</p>}
      {success && <p className="success" role="status">{success}</p>}
    </form>
  );
}