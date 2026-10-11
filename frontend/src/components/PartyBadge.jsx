// Shows whether the room is currently playing: a vinyl that spins and a tiny equalizer.
// It only displays state; it never sends anything to the server.

export default function PartyBadge({ playing, hasVideo }) {
  const label = !hasVideo ? "Waiting for a video" : playing ? "Now playing" : "Paused";

  return (
    <div className={`party-badge ${playing ? "on" : ""}`}>
      <div className="vinyl" />
      <div>
        <p className="eyebrow">{label}</p>
        <div className="mini-eq" aria-hidden="true">
          <i /><i /><i /><i /><i />
        </div>
      </div>
    </div>
  );
}