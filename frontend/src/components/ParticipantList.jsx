// 


import { useState } from "react";
import { emitAck } from "../services/socket";

export default function ParticipantList({ participants, myUserId, myRole }) {
  const [error, setError] = useState("");
  const [busyUserId, setBusyUserId] = useState(null);
  const iAmHost = myRole === "host";

  async function send(event, payload, userId) {
    setError("");
    setBusyUserId(userId);
    try {
      const res = await emitAck(event, payload);
      if (!res.ok) setError(res.error);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyUserId(null);
    }
  }

  function handleRole(p, role) {
    send("assign_role", { userId: p.userId, role }, p.userId);
  }

  function handleRemove(p) {
    if (window.confirm(`Remove ${p.username} from the room?`)) {
      send("remove_participant", { userId: p.userId }, p.userId);
    }
  }

  return (
    <div>
      <h3>Participants ({participants.length})</h3>
      <ul className="participants">
        {participants.map((p) => {
          const showControls = iAmHost && p.userId !== myUserId; // never on yourself
          return (
            <li key={p.userId}>
              <div className="person">
                <span>
                  {p.username}
                  {p.userId === myUserId && " (you)"}
                </span>
                <span className={`role role-${p.role}`}>{p.role}</span>
              </div>
              {showControls && (
                <div className="actions">
                  {p.role === "participant" ? (
                    <button disabled={busyUserId === p.userId} onClick={() => handleRole(p, "moderator")}>
                      Make Moderator
                    </button>
                  ) : (
                    <button disabled={busyUserId === p.userId} onClick={() => handleRole(p, "participant")}>
                      Make Participant
                    </button>
                  )}
                  <button className="danger" disabled={busyUserId === p.userId} onClick={() => handleRemove(p)}>
                    Remove
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="error">{error}</p>}
    </div>
  );
}