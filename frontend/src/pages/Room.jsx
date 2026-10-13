
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import RoomView from "../components/RoomView";
import { emitAck, socket } from "../services/socket";
import { useConnected } from "../hooks/useConnected";
import ServerStatus from "../components/ServerStatus";

export default function Room() {
  const { code = "" } = useParams();
  const location = useLocation();

  const [joined, setJoined] = useState(
    location.state?.userId === socket.id ? location.state : null
  );

  const connected = useConnected();
  useEffect(() => { document.title = `Room ${code.toUpperCase()} | WatchParty`; }, [code]);

  if (!joined) {
    return (
      <JoinForm
        code={code}
        onJoined={setJoined}
        connected={connected}
      />
    );
  }

  return <RoomView initial={joined} />;
}

function JoinForm({ code, onJoined, connected }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const res = await emitAck("join_room", {
        roomId: code,
        username,
      });

      if (res.ok) {
        onJoined(res);
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
    <main className="card">
      <h1>Join room {code.toUpperCase()}</h1>

      <ServerStatus connected={connected} />

      <form onSubmit={handleSubmit}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your name"
          maxLength={20}
          autoFocus
        />

        <button disabled={busy || !connected}>
          {busy ? "Joining…" : "Join"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <Link to="/">Back to home</Link>
    </main>
  );
}
// ```