import { useState } from "react";
import { emitAck } from "../services/socket";
import { extractVideoId } from "../utils/youtube";

export default function VideoUrlForm() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const videoId = extractVideoId(url);
    if (!videoId) return setError("That doesn't look like a valid YouTube link.");

    setBusy(true);
    try {
      const res = await emitAck("change_video", { videoId });
      if (res.ok) setUrl("");
      else setError(res.error);
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
      {error && <p className="error">{error}</p>}
    </form>
  );
}