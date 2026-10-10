import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import RoomView from "../components/RoomView";
import { emitAck } from "../services/socket";
import { socket } from "../services/socket";

export default function Room() {
  const { code = "" } = useParams();
  const location = useLocation();
  const [joined, setJoined] = useState(
  location.state?.userId === socket.id ? location.state : null
);
  // const [joined, setJoined] = useState(location.state ?? null);

  if (!joined) return <JoinForm code={code} onJoined={setJoined} />;
  return <RoomView initial={joined} />;
}

function JoinForm({ code, onJoined }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await emitAck("join_room", { roomId: code, username });
      if (res.ok) onJoined(res);
      else setError(res.error);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="card">
      <h1>Join room {code.toUpperCase()}</h1>
      <form onSubmit={handleSubmit}>
        <input value={username} onChange={(e) => setUsername(e.target.value)}
               placeholder="Your name" maxLength={20} autoFocus />
        <button disabled={busy}>{busy ? "Joining…" : "Join"}</button>
      </form>
      {error && <p className="error">{error}</p>}
      <Link to="/">Back to home</Link>
    </main>
  );
}