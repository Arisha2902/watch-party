import { useEffect, useRef, useState } from "react";
import { emitAck } from "../services/socket";

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chat({ messages, myUserId }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  // Scroll the chat box itself (not the whole page) when a message arrives
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function handleSubmit(e) {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;

    setError("");
    setBusy(true);
    try {
      const res = await emitAck("chat_message", { text: clean });
      if (res.ok) setText("");
      else setError(res.error);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat">
      <h3>Chat</h3>

      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && <p className="muted">No messages yet. Say hello!</p>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.userId === myUserId ? "mine" : ""}`}>
            <div className="chat-meta">
              <strong>{m.userId === myUserId ? "You" : m.username}</strong>
              <span className={`role role-${m.role}`}>{m.role}</span>
              <time>{formatTime(m.sentAt)}</time>
            </div>
            {/* React escapes text automatically, so a message can never inject HTML */}
            <p>{m.text}</p>
          </div>
        ))}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          maxLength={300}
        />
        <button disabled={busy || !text.trim()}>Send</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}