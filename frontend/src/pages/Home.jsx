import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { emitAck } from "../services/socket";
import { useConnected } from "../hooks/useConnected";
import ServerStatus from "../components/ServerStatus";
import "../landing.css";

// ---------- page content (only things this project really does) ----------

const STEPS = [
  { n: "01", title: "Create a room", text: "Pick a name and start a room. You become the Host and get a 6-character room code." },
  { n: "02", title: "Invite your friends", text: "Share the code or the invite link. Everyone who joins is a Participant and shows up in the live list." },
  { n: "03", title: "Watch in sync", text: "Paste a YouTube link. When the Host plays, pauses or seeks, everyone follows instantly." },
];

const FEATURES = [
  { icon: "⚡", title: "Real-time sync", text: "Play, pause, seek and video changes reach everyone in the room through WebSockets." },
  { icon: "🔗", title: "Codes and invite links", text: "Every room has a unique code and a shareable link. Joining takes a name and one click." },
  { icon: "🛡️", title: "Server-enforced roles", text: "The server checks every action. A Participant who tries to take control from the browser console is rejected." },
  { icon: "⏱️", title: "Join at the right moment", text: "Late joiners start at the current position, playing or paused, instead of at 0:00." },
  { icon: "👥", title: "Live participant list", text: "See who is in the room and their role. It updates as people join, leave or get promoted." },
  { icon: "🔁", title: "Host handover", text: "If the Host ever leaves, the oldest Moderator (or Participant) takes over automatically, so the room is never left without someone in charge." },
  { icon: "💬", title: "Live chat", text: "Talk while you watch. Messages reach everyone in the room instantly, and nobody can pretend to be someone else." },
  { icon: "🎉", title: "Emoji reactions", text: "Tap 👍 ❤️ 😂 🔥 👏 🎉 and the emoji float over the video for the whole room to see." },
];

const ROLES = [
  { role: "host", title: "Host", who: "Whoever creates the room",
    can: ["Play, pause and seek", "Change the video", "Promote people to Moderator", "Remove participants"], cannot: [] },
  { role: "moderator", title: "Moderator", who: "Promoted by the Host",
    can: ["Play, pause and seek", "Change the video", "Chat and react"], cannot: ["Assign roles", "Remove participants"] },
  { role: "participant", title: "Participant", who: "Everyone who joins",
    can: ["Watch in sync", "Chat and react"], cannot: ["Control playback", "Change the video"] },
];

const STACK = ["React", "Vite", "Node.js", "Express", "Socket.IO", "WebSockets", "YouTube IFrame API", "TypeScript (backend)"];

const FLOW = ["Your browser", "Socket.IO", "Server (single source of truth)", "Everyone in the room"];

const FAQ = [
  { q: "Do I need an account?", a: "No. Pick a username and you are in. Usernames only need to be unique inside a room." },
  { q: "Who can control the video?", a: "The Host and any Moderators the Host appoints. Participants watch in sync but cannot play, pause, seek or change the video." },
  { q: "What happens if the Host leaves?", a: "The oldest Moderator becomes the new Host. If there is no Moderator, the oldest Participant does. When the last person leaves, the room is deleted." },
  { q: "Which videos work?", a: "Any YouTube link that allows embedding. If a video's owner has disabled embedding, the room shows a message instead of the video." },
  { q: "Can anyone join my room?", a: "Anyone who has the room code or link can join, so share it only with people you trust. The Host can remove someone, but a removed person can rejoin with the code." },
  { q: "How long does a room last?", a: "Rooms live in the server's memory. They disappear when everyone leaves or the server restarts, because nothing is saved to a database. Chat messages are not stored either, so someone who joins late only sees messages sent after they arrive." },
];

const MOCK_PEOPLE = [["Arisha", "host"], ["Rahul", "moderator"], ["Aman", "participant"]];

export default function Home() {
  const navigate = useNavigate();
  const connected = useConnected();
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Fade sections in as they scroll into view
  useEffect(() => {
    const items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

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
    setError("");
    navigate(`/room/${clean}`);
  }

  return (
    <div className="lp" id="top">
      {/* ---------- navigation ---------- */}
      <nav className="lp-nav">
        <a href="#top" className="lp-brand">Watch<span>Party</span></a>
        <div className="lp-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#roles">Roles</a>
          <a href="#faq">FAQ</a>
        </div>
        <a href="#start" className="lp-cta lp-cta-sm">Start a party</a>
      </nav>

      {/* ---------- hero + the create / join form ---------- */}
      <section className="lp-hero">
        <div className="lp-hero-text">
          <p className="eyebrow">Real-time watch parties</p>
          <h1>Watch together, <em>perfectly in sync.</em></h1>
          <p className="lp-lead">
            Create a room, share the code, and everyone sees the same video at the same moment:
            play, pause, seek and even video changes, live.
          </p>
          <div className="lp-actions">
            <a href="#start" className="lp-cta">Create a room</a>
            <a href="#how" className="lp-ghost">See how it works</a>
          </div>
          <div className="lp-chips">
            <span>No sign-up</span>
            <span>Live over WebSockets</span>
            <span>Host and Moderator roles</span>
          </div>
        </div>

        <div className="card" id="start">
          <h2>Start watching</h2>
          <ServerStatus connected={connected} />

          <h3>Create a room</h3>
          <form onSubmit={handleCreate}>
            <input value={username} onChange={(e) => setUsername(e.target.value)}
                   placeholder="Your name" maxLength={20} />
            <button disabled={busy || !connected}>{busy ? "Creating…" : "Create"}</button>
          </form>

          <h3>Join a room</h3>
          <form onSubmit={handleGoToRoom}>
            <input value={code} onChange={(e) => setCode(e.target.value)}
                   placeholder="Room code" maxLength={6} />
            <button>Join</button>
          </form>

          {error && <p className="error">{error}</p>}
          <p className="muted">No account needed. Just pick a name.</p>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section id="how" className="lp-section">
        <div className="lp-head reveal">
          <p className="eyebrow">How it works</p>
          <h2>Three steps to a shared screen</h2>
          <p>From an empty room to everyone watching together in under a minute.</p>
        </div>
        <div className="lp-grid">
          {STEPS.map((s, i) => (
            <div key={s.n} className="lp-card reveal" style={{ "--i": i }}>
              <div className="lp-step-n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section id="features" className="lp-section">
        <div className="lp-head reveal">
          <p className="eyebrow">Features</p>
          <h2>Built for watching, not fiddling</h2>
          <p>Everything the room needs to stay together, and nothing it does not.</p>
        </div>
        <div className="lp-grid">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="lp-card reveal" style={{ "--i": i % 3 }}>
              <div className="lp-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- a look inside a room (illustration) ---------- */}
      <section className="lp-section">
        <div className="lp-head reveal">
          <p className="eyebrow">A quick look</p>
          <h2>Inside a room</h2>
          <p>One shared player, one live participant list. Illustration only.</p>
        </div>
        <div className="lp-mock reveal">
          <div className="lp-mock-player">
            <div className="lp-mock-play">▶</div>
            <div className="lp-mock-bar"><i /></div>
          </div>
          <div className="lp-mock-side">
            <h3>Participants (3)</h3>
            <ul className="participants">
              {MOCK_PEOPLE.map(([name, role]) => (
                <li key={name}>
                  <div className="person">
                    <span>{name}</span>
                    <span className={`role role-${role}`}>{role}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- roles ---------- */}
      <section id="roles" className="lp-section">
        <div className="lp-head reveal">
          <p className="eyebrow">Roles</p>
          <h2>Everyone knows who is in charge</h2>
          <p>The Host decides who can steer. The server enforces it, so it cannot be bypassed from the browser.</p>
        </div>
        <div className="lp-grid">
          {ROLES.map((r, i) => (
            <div key={r.role} className="lp-card reveal" style={{ "--i": i }}>
              <span className={`role role-${r.role}`}>{r.title}</span>
              <p className="lp-who">{r.who}</p>
              <ul className="lp-list">
                {r.can.map((item) => <li key={item}>{item}</li>)}
              </ul>
              {r.cannot.length > 0 && (
                <ul className="lp-list no">
                  {r.cannot.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---------- under the hood ---------- */}
      <section className="lp-section">
        <div className="lp-head reveal">
          <p className="eyebrow">Under the hood</p>
          <h2>One source of truth</h2>
          <p>
            Your buttons only send requests. The server checks the role, updates the room's state,
            and tells everyone, so every screen shows the same thing.
          </p>
        </div>
        <div className="lp-flow reveal">
          {FLOW.map((step, i) => (
            <span key={step} className="lp-flow-item">
              <b>{step}</b>
              {i < FLOW.length - 1 && <em className="lp-arrow">→</em>}
            </span>
          ))}
        </div>
        <div className="lp-chips lp-chips-center reveal">
          {STACK.map((t) => <span key={t}>{t}</span>)}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="lp-section">
        <div className="lp-head reveal">
          <p className="eyebrow">FAQ</p>
          <h2>Good to know</h2>
        </div>
        <div className="lp-faq">
          {FAQ.map((item, i) => (
            <details key={item.q} className="reveal" style={{ "--i": i % 3 }}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- final call to action + footer ---------- */}
      <section className="lp-final reveal">
        <h2>Ready to start a party?</h2>
        <a href="#start" className="lp-cta">Create a room</a>
      </section>

      <footer className="lp-footer">
        YouTube Watch Party · Built with React, Node.js and Socket.IO
      </footer>
    </div>
  );
}