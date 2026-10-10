import { useEffect, useRef, useState } from "react";
import { emitAck } from "../services/socket";

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function SeekControl({ getPlayer }) {
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const draggingRef = useRef(false);
  const holdUntilRef = useRef(0); // don't snap back before the server's answer arrives

  // Poll the player twice a second to keep the slider moving
  useEffect(() => {
    const id = setInterval(() => {
      const player = getPlayer();
      if (!player) return;
      setDuration(player.getDuration() || 0);
      if (!draggingRef.current && Date.now() > holdUntilRef.current) {
        setPosition(player.getCurrentTime() || 0);
      }
    }, 500);
    return () => clearInterval(id);
  }, [getPlayer]);

  async function commit() {
    draggingRef.current = false;
    holdUntilRef.current = Date.now() + 1000;
    setError("");
    try {
      const res = await emitAck("seek", { time: position });
      if (!res.ok) setError(res.error);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="seek">
      <span>{formatTime(position)}</span>
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={1}
        value={Math.min(position, duration || 1)}
        disabled={!duration}
        onChange={(e) => {
          draggingRef.current = true;
          setPosition(Number(e.target.value));
        }}
        onPointerUp={commit}
        onKeyUp={commit}
      />
      <span>{formatTime(duration)}</span>
      {error && <span className="error">{error}</span>}
    </div>
  );
}