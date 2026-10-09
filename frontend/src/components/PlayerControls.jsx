import { useState } from "react";
import { emitAck } from "../services/socket";

export default function PlayerControls({ playState, hasVideo, canControl }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleToggle() {
    setError("");
    setBusy(true);
    try {
      const event = playState === "playing" ? "pause" : "play";
      const res = await emitAck(event, {});
      if (!res.ok) setError(res.error);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!canControl) {
    return <p className="muted">Only the host and moderators control playback.</p>;
  }

  return (
    <div className="controls">
      <button onClick={handleToggle} disabled={!hasVideo || busy}>
        {playState === "playing" ? "⏸ Pause" : "▶ Play"}
      </button>
      {!hasVideo && <span className="muted">Waiting for a video.</span>}
      {error && <span className="error">{error}</span>}
    </div>
  );
}