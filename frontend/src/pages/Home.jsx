import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { emitAck } from "../services/socket";

export default function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await emitAck("create_room", { username });
      if (res.ok) navigate(`/room/${res.roomId}`, { state: res });
      else setError(res.error);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleGoToRoom(e) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6) return setError("Enter a valid 6-character room code.");
    navigate(`/room/${clean}`);
  }

  return (
    <main className="card">
      <h1>YouTube Watch Party</h1>

      <h3>Create a room</h3>
      <form onSubmit={handleCreate}>
        <input value={username} onChange={(e) => setUsername(e.target.value)}
               placeholder="Your name" maxLength={20} />
        <button disabled={busy}>{busy ? "Creating…" : "Create"}</button>
      </form>

      <h3>Join a room</h3>
      <form onSubmit={handleGoToRoom}>
        <input value={code} onChange={(e) => setCode(e.target.value)}
               placeholder="Room code" maxLength={6} />
        <button>Join</button>
      </form>

      {error && <p className="error">{error}</p>}
    </main>
  );
}