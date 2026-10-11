import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket, emitAck } from "../services/socket";
import { extractVideoId } from "../utils/youtube";
import ServerStatus from "../components/ServerStatus";
import "../home.css";

/* ---------- tiny inline icon set (no icon library needed) ---------- */
const PATHS = {
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </>
  ),
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.5 3-6 6-6s6 2.5 6 6" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M18 14.5c2 .7 3 2.8 3 5.5" />
    </>
  ),
  swap: (
    <>
      <path d="M7 7h13l-3-3" />
      <path d="M17 17H4l3 3" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  spark: <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />,
  play: <path d="M7 4l13 8-13 8z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  check: <path d="M5 12l5 5 9-10" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  crown: <path d="M3 8l5 5 4-8 4 8 5-5-2 11H5z" />,
  sliders: <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4" />,
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  server: (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  radio: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10" />
    </>
  ),
};

function Icon({ name, size = 16 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

/* ---------- page content (kept accurate to what the app really does) ---------- */
const STEPS = [
  {
    n: "01", icon: "plus", tone: "orange", title: "Create a room",
    text: "Pick a name and start a room. You become the Host and get a 6-character room code.",
    tag: "No sign-up needed",
  },
  {
    n: "02", icon: "link", tone: "amber", title: "Invite your friends",
    text: "Share the code or the invite link. Everyone who joins is a Participant and appears in the live list.",
    tag: "Invite by link",
  },
  {
    n: "03", icon: "play", tone: "green", title: "Watch in sync",
    text: "Paste a YouTube link. When the Host plays, pauses or seeks, every viewer's player follows.",
    tag: "Server is the source of truth",
  },
];

const FEATURES = [
  { icon: "bolt", title: "Real-time sync", text: "Play, pause, seek and video changes reach everyone in the room instantly over WebSockets." },
  { icon: "link", title: "Codes and invite links", text: "Every room gets a short code and a shareable link. Joining only needs a display name." },
  { icon: "shield", title: "Server-enforced roles", text: "The server checks every request. A participant who fakes a play command from DevTools is rejected." },
  { icon: "clock", title: "Join at the right moment", text: "Late joiners start at the live position of the video, not at zero." },
  { icon: "users", title: "Live participant list", text: "See who is in the room and their role. The list updates as friends join or leave." },
  { icon: "swap", title: "Host handover", text: "If the Host leaves, the oldest Moderator (or oldest Participant) becomes Host automatically." },
  { icon: "chat", title: "Live chat", text: "Chat while you watch. Each message shows the sender's name and role." },
  { icon: "spark", title: "Emoji reactions", text: "Tap an emoji and it floats over the video for everyone in the room." },
];

const ROLES = [
  {
    key: "host", tone: "orange", icon: "crown", name: "Room Creator", sub: "Full control of the room.",
    items: [
      [true, "Play, pause and seek"], [true, "Change the video"],
      [true, "Promote people to Moderator"], [true, "Remove participants"],
    ],
    foot: "Assigned when you create the room",
  },
  {
    key: "moderator", tone: "blue", icon: "sliders", name: "Co-Pilot", sub: "A trusted friend who can steer the video.",
    items: [
      [true, "Play, pause and seek"], [true, "Change the video"], [true, "Chat and react"],
      [false, "Assign roles"], [false, "Remove participants"],
    ],
    foot: "Granted by the Host",
  },
  {
    key: "participant", tone: "grey", icon: "eye", name: "Viewer Guest", sub: "The default for everyone who joins.",
    items: [
      [true, "Watch in sync"], [true, "Chat and react"],
      [false, "Control playback"], [false, "Change the video"],
    ],
    foot: "Default for anyone joining",
  },
];

const FLOW = [
  { icon: "monitor", name: "Your browser", sub: "Sends a request", edge: "emit", tone: "" },
  { icon: "radio", name: "Socket.IO", sub: "WebSocket channel", edge: "validate", tone: "blue" },
  { icon: "server", name: "Node server", sub: "Holds the room state", edge: "broadcast", tone: "orange" },
  { icon: "users", name: "Room viewers", sub: "Apply the new state", edge: null, tone: "green" },
];

const TECH = ["React", "Vite", "Node.js", "Express", "Socket.IO", "WebSockets", "YouTube IFrame API", "TypeScript (backend)"];

const FAQ = [
  ["Do I need an account?", "No. Pick a display name and create or join a room. Nothing is stored about you after you leave."],
  ["Who can control the video?", "The Host and any Moderators can play, pause, seek and change the video. Participants watch, chat and react. The server enforces this, not just the buttons."],
  ["What happens if the Host leaves?", "The oldest Moderator becomes the new Host. If there is no Moderator, the oldest Participant does. When the last person leaves, the room is deleted."],
  ["Which videos work?", "Public YouTube videos that allow embedding. You can paste watch, youtu.be, shorts, embed or live links. If a video blocks embedding, the player shows an error."],
  ["Can anyone join my room?", "Anyone who has the 6-character code or the invite link can join. Display names must be unique inside a room."],
  ["How long does a room last?", "Until everyone leaves. Rooms live in the server's memory, so they are also lost if the server restarts."],
];

/* ---------- small sections ---------- */
function SectionHead({ kicker, title, text }) {
  return (
    <div className="sec-head">
      <p className="kicker mono">{kicker}</p>
      <h2>{title}</h2>
      {text && <p className="sub">{text}</p>}
    </div>
  );
}

function RoomPreview() {
  return (
    <div className="preview panel">
      <div className="preview-top">
        <span className="dot" />
        <strong>Demo room</strong>
        <span className="chip mono">ROOM · 6-CHAR CODE</span>
        <span className="chip chip-green mono">3 IN ROOM</span>
      </div>

      <div className="preview-body">
        <div>
          <div className="mock-player">
            <span className="mock-btn"><Icon name="pause" size={26} /></span>
            <div className="mock-bar"><i /></div>
          </div>
        </div>

        <div className="preview-side">
          <div className="mini-panel">
            <p className="mini-title">Participants <span className="chip mono">3</span></p>
            {[
              ["Arisha", "host", "Host (you)"],
              ["Rahul", "moderator", "Moderator"],
              ["Aman", "participant", "Participant"],
            ].map(([name, role, label]) => (
              <div className="mini-row" key={name}>
                <span className={`avatar av-${role}`}>{name[0]}</span>
                <span>{name}</span>
                <span className={`pill pill-${role} mono`}>{label}</span>
              </div>
            ))}
          </div>

          <div className="mini-panel">
            <p className="mini-title">Room chat</p>
            <p className="mini-msg"><strong>Arisha</strong> Ready? Pressing play.</p>
            <p className="mini-msg"><strong>Rahul</strong> Synced on my side 🔥</p>
          </div>
        </div>
      </div>
      <p className="preview-note mono">Illustration of the room layout.</p>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState(null);
  return (
    <div className="faq">
      {FAQ.map(([q, a], i) => (
        <div className="faq-item" key={q}>
          <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
            <span>{q}</span>
            <Icon name={open === i ? "x" : "plus"} size={14} />
          </button>
          {open === i && <p className="faq-a">{a}</p>}
        </div>
      ))}
    </div>
  );
}

/* ---------- the page ---------- */
export default function Home() {
  const navigate = useNavigate();
  const nameRef = useRef(null);

  const [tab, setTab] = useState("create");
  const [username, setUsername] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const on = () => setConnected(true);
    const off = () => setConnected(false);
    socket.on("connect", on);
    socket.on("disconnect", off);
    return () => {
      socket.off("connect", on);
      socket.off("disconnect", off);
    };
  }, []);

  function startParty() {
    setTab("create");
    document.getElementById("start")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => nameRef.current?.focus(), 450);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const name = username.trim();
    if (!name) return setError("Enter your name first.");

    let videoId = null;
    if (tab === "create" && videoUrl.trim()) {
      videoId = extractVideoId(videoUrl);
      if (!videoId) return setError("That doesn't look like a valid YouTube link.");
    }

    let roomCode = "";
    if (tab === "join") {
      roomCode = code.trim().toUpperCase();
      if (roomCode.length !== 6) return setError("Enter a valid 6-character room code.");
    }

    setBusy(true);
    try {
      const res =
        tab === "create"
          ? await emitAck("create_room", { username: name })
          : await emitAck("join_room", { roomId: roomCode, username: name });

      if (!res.ok) return setError(res.error);

      // Optional first video: the new Host loads it before entering the room
      if (videoId) {
        const v = await emitAck("change_video", { videoId });
        if (v.ok) res.state = { ...res.state, videoId, playState: "paused", currentTime: 0 };
      }

      navigate(`/room/${res.roomId}`, { state: res });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lp">
      {/* ---- nav ---- */}
      <nav className="lp-nav">
        <div className="wrap">
          <a className="lp-brand" href="#top">
            <span className="lp-logo"><Icon name="play" size={13} /></span>
            WatchParty
          </a>
          <div className="lp-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#inside">Inside a Room</a>
            <a href="#roles">Roles</a>
            <a href="#faq">FAQ</a>
            <a href="#tech">Tech Stack</a>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={startParty}>
            Start a party
          </button>
        </div>
      </nav>

      <ServerStatus connected={connected} />

      {/* ---- hero ---- */}
      <header className="lp-hero" id="top">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow-chip mono"><i /> Real-time watch parties</span>
            <h1 className="lp-title">
              Watch together,
              <br />
              <em>perfectly in sync.</em>
            </h1>
            <p className="lead">
              Create a room, share the code, and everyone sees the same YouTube video at the same moment:
              play, pause, seek and video changes, live.
            </p>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary" onClick={startParty}>
                <Icon name="monitor" size={15} /> Create a room
              </button>
              <a className="btn btn-ghost" href="#how">
                <Icon name="play" size={14} /> See how it works
              </a>
            </div>
            <div className="hero-chips">
              <span className="chip mono"><Icon name="check" size={12} /> No sign-up</span>
              <span className="chip mono"><Icon name="swap" size={12} /> Live over WebSockets</span>
              <span className="chip mono"><Icon name="shield" size={12} /> Host and Moderator roles</span>
            </div>
          </div>

          <form className="start-card" id="start" onSubmit={handleSubmit}>
            <div className="start-head">
              <div>
                <h3>Start watching</h3>
                <p className="mono">Create a room or join a friend's</p>
              </div>
              <span className="start-icon"><Icon name="monitor" size={16} /></span>
            </div>

            <div className="tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === "create"}
                      className={`tab ${tab === "create" ? "on" : ""}`}
                      onClick={() => { setTab("create"); setError(""); }}>
                Create Room
              </button>
              <button type="button" role="tab" aria-selected={tab === "join"}
                      className={`tab ${tab === "join" ? "on" : ""}`}
                      onClick={() => { setTab("join"); setError(""); }}>
                Join Room
              </button>
            </div>

            <div className="field">
              <label htmlFor="lp-name">Your name</label>
              <input id="lp-name" ref={nameRef} value={username}
                     onChange={(e) => setUsername(e.target.value)}
                     placeholder="e.g. Alex" maxLength={20} />
            </div>

            {tab === "create" ? (
              <div className="field">
                <label htmlFor="lp-video">Video source (optional)</label>
                <input id="lp-video" value={videoUrl}
                       onChange={(e) => setVideoUrl(e.target.value)}
                       placeholder="Paste a YouTube link" />
              </div>
            ) : (
              <div className="field">
                <label htmlFor="lp-code">Room code</label>
                <input id="lp-code" value={code}
                       onChange={(e) => setCode(e.target.value.toUpperCase())}
                       placeholder="6-character code" maxLength={6} />
              </div>
            )}

            <button className="btn btn-primary btn-block" disabled={busy || !connected}>
              {busy ? "Please wait…" : tab === "create" ? "Create Room" : "Join Room"}
            </button>
            {error && <p className="form-error">{error}</p>}

            <p className="start-foot mono">
              <span>No account needed. Just pick a name.</span>
              <span>WebSocket sync</span>
            </p>
          </form>
        </div>
      </header>

      {/* ---- how it works ---- */}
      <section className="lp-section" id="how">
        <div className="wrap">
          <SectionHead kicker="How it works" title="Three steps to a shared screen"
                       text="From an empty room to everyone watching together in under a minute." />
          <div className="steps">
            {STEPS.map((s) => (
              <div className={`step panel tone-${s.tone}`} key={s.n}>
                <div className="step-top">
                  <span className="step-n">{s.n}</span>
                  <span className="icon-box"><Icon name={s.icon} size={14} /></span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <span className="step-tag mono">{s.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- features ---- */}
      <section className="lp-section" id="features">
        <div className="wrap">
          <SectionHead kicker="Features" title="Built for watching, not fiddling"
                       text="Everything the room needs to stay together, and nothing it does not." />
          <div className="features">
            {FEATURES.map((f) => (
              <div className="feature panel" key={f.title}>
                <span className="icon-box"><Icon name={f.icon} size={15} /></span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- inside a room ---- */}
      <section className="lp-section" id="inside">
        <div className="wrap">
          <SectionHead kicker="A quick look" title="Inside a room"
                       text="One shared player, one live participant list, and a chat." />
          <RoomPreview />
        </div>
      </section>

      {/* ---- roles ---- */}
      <section className="lp-section" id="roles">
        <div className="wrap">
          <SectionHead kicker="Roles and governance" title="Everyone knows who is in charge"
                       text="The Host decides who can steer. The server enforces it, so permissions cannot be bypassed from the browser." />
          <div className="roles">
            {ROLES.map((r) => (
              <div className={`role-card panel tone-${r.tone}`} key={r.key}>
                <div className="role-top">
                  <span className={`pill pill-${r.key} mono`}>{r.key}</span>
                  <Icon name={r.icon} size={16} />
                </div>
                <h3>{r.name}</h3>
                <p className="role-sub">{r.sub}</p>
                <ul>
                  {r.items.map(([ok, label]) => (
                    <li key={label} className={ok ? "yes" : "no"}>
                      <Icon name={ok ? "check" : "x"} size={13} /> {label}
                    </li>
                  ))}
                </ul>
                <p className="role-foot mono">{r.foot}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- under the hood ---- */}
      <section className="lp-section" id="tech">
        <div className="wrap">
          <div className="panel hood">
            <SectionHead kicker="Under the hood" title="One source of truth"
                         text="Your buttons only send requests. The server checks the role, updates the room's single state, and broadcasts it to everyone." />
            <div className="flow">
              {FLOW.map((n) => (
                <div className="flow-node-wrap" key={n.name}>
                  <div className={`flow-node tone-${n.tone || "grey"}`}>
                    <Icon name={n.icon} size={16} />
                    <strong>{n.name}</strong>
                    <span className="mono">{n.sub}</span>
                  </div>
                  {n.edge && <span className="flow-edge mono">{n.edge} →</span>}
                </div>
              ))}
            </div>
            <p className="hood-note mono">
              <i /> Each player re-syncs automatically if it drifts more than half a second from the server.
            </p>
            <div className="tech">
              {TECH.map((t) => <span className="chip mono" key={t}>{t}</span>)}
            </div>
          </div>
        </div>
      </section>

      {/* ---- faq ---- */}
      <section className="lp-section" id="faq">
        <div className="wrap narrow">
          <SectionHead kicker="FAQ" title="Good to know"
                       text="Everything you need to know about rooms, videos and sync." />
          <Faq />
        </div>
      </section>

      {/* ---- final cta ---- */}
      <section className="lp-section">
        <div className="wrap narrow">
          <div className="cta panel">
            <p className="kicker mono">Zero setup required</p>
            <h2>Ready to start a party?</h2>
            <p className="sub">Create a room right now and invite your friends in one click.</p>
            <button type="button" className="btn btn-primary" onClick={startParty}>
              <Icon name="play" size={13} /> Create a room
            </button>
            <p className="cta-foot mono">No sign-up · No extension · Works in the browser</p>
          </div>
        </div>
      </section>

      {/* ---- footer ---- */}
      <footer className="lp-footer">
        <div className="wrap">
          <div className="foot-top">
            <div>
              <strong>WatchParty</strong>
              <p>Watch YouTube together, in sync, with friends anywhere.</p>
            </div>
          </div>
          <div className="tech tech-foot">
            {TECH.map((t) => <span className="chip mono" key={t}>{t}</span>)}
          </div>
          <p className="copy mono">© {new Date().getFullYear()} WatchParty</p>
        </div>
      </footer>
    </div>
  );
}