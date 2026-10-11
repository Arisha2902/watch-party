import { useState } from "react";
import { emitAck } from "../services/socket";

// The button sends a KEY. The server decides which emoji it means (whitelist on the backend).
const OPTIONS = [
  ["like", "👍"],
  ["love", "❤️"],
  ["laugh", "😂"],
  ["fire", "🔥"],
  ["clap", "👏"],
  ["party", "🎉"],
];

export default function ReactionBar() {
  const [error, setError] = useState("");

  function flash(message) {
    setError(message);
    setTimeout(() => setError(""), 2000);
  }

  async function send(type) {
    try {
      const res = await emitAck("reaction", { type });
      if (!res.ok) flash(res.error); // e.g. "Slow down a little."
    } catch (err) {
      flash(err.message);
    }
  }

  return (
    <div className="reaction-bar">
      {OPTIONS.map(([type, emoji]) => (
        <button key={type} className="reaction-btn" onClick={() => send(type)} title={type}>
          {emoji}
        </button>
      ))}
      {error && <span className="muted">{error}</span>}
    </div>
  );
}